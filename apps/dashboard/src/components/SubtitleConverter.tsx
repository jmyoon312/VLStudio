import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import AIModelSelector from '@/components/shared/AIModelSelector';
import { formatTextWithLineBreaks } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Play, FileText, Save, Loader2, Wand2, FileAudio, AlertCircle, WrapText } from 'lucide-react';

import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

interface LogEntry {
    time: string;
    message: string;
    type: 'info' | 'error';
}

const SubtitleConverter = () => {
    const location = useLocation();
    const state = location.state as { srtContent?: string; mediaUrl?: string; serverPath?: string; originalScript?: string } | null;

    // State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalScript, setOriginalScript] = useState(() => {
        return state?.originalScript || localStorage.getItem('sub_conv_originalScript') || '';
    });
    const [srtContent, setSrtContent] = useState(() => {
        return state?.srtContent || localStorage.getItem('sub_conv_srtContent') || '';
    });
    const [isAlignmentMode, setIsAlignmentMode] = useState(() => {
        return localStorage.getItem('sub_conv_isAlignmentMode') !== 'false';
    });
    const [isManualMarkerMode, setIsManualMarkerMode] = useState(() => {
        return localStorage.getItem('sub_conv_isManualMarkerMode') === 'true';
    });
    const [splitLimit, setSplitLimit] = useState(() => {
        return Number(localStorage.getItem('sub_conv_splitLimit')) || 10;
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [resultStep1, setResultStep1] = useState(() => {
        return localStorage.getItem('sub_conv_resultStep1') || '';
    });
    const [resultStep2, setResultStep2] = useState(() => {
        return localStorage.getItem('sub_conv_resultStep2') || '';
    });
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('sub_conv_activeTab') || 'step2';
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Auto-Save changes to localStorage
    useEffect(() => {
        localStorage.setItem('sub_conv_originalScript', originalScript);
    }, [originalScript]);

    useEffect(() => {
        localStorage.setItem('sub_conv_srtContent', srtContent);
    }, [srtContent]);

    useEffect(() => {
        localStorage.setItem('sub_conv_resultStep1', resultStep1);
    }, [resultStep1]);

    useEffect(() => {
        localStorage.setItem('sub_conv_resultStep2', resultStep2);
    }, [resultStep2]);

    useEffect(() => {
        localStorage.setItem('sub_conv_isAlignmentMode', String(isAlignmentMode));
    }, [isAlignmentMode]);

    useEffect(() => {
        localStorage.setItem('sub_conv_isManualMarkerMode', String(isManualMarkerMode));
    }, [isManualMarkerMode]);

    useEffect(() => {
        localStorage.setItem('sub_conv_splitLimit', String(splitLimit));
    }, [splitLimit]);

    useEffect(() => {
        localStorage.setItem('sub_conv_activeTab', activeTab);
    }, [activeTab]);

    // Options
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('sub_conv_language') || 'auto';
    });
    const [subtitleModel, setSubtitleModel] = useState(() => {
        return localStorage.getItem('sub_conv_subtitleModel') || 'base';
    });

    // AI Segmentation Options
    const [segmentProvider, setSegmentProvider] = useState<string>(() => {
        return localStorage.getItem('sub_conv_segmentProvider') || 'groq';
    });
    const [segmentModel, setSegmentModel] = useState<string>(() => {
        return localStorage.getItem('sub_conv_segmentModel') || 'groq/llama-3.3-70b-versatile';
    });

    useEffect(() => {
        localStorage.setItem('sub_conv_language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('sub_conv_subtitleModel', subtitleModel);
    }, [subtitleModel]);

    useEffect(() => {
        localStorage.setItem('sub_conv_segmentProvider', segmentProvider);
    }, [segmentProvider]);

    useEffect(() => {
        localStorage.setItem('sub_conv_segmentModel', segmentModel);
    }, [segmentModel]);



    const fileInputRef = useRef<HTMLInputElement>(null);

    // Effect to handle incoming state
    useEffect(() => {
        if (state?.srtContent) {
            setSrtContent(state.srtContent);
            addLog("MultiTTS에서 자막 데이터 수신됨");
            setActiveTab("step1");
        }
        if (state?.originalScript) {
            setOriginalScript(state.originalScript);
            addLog("MultiTTS에서 원본 대본 수신됨");
        }
    }, [state]);

    // Helpers
    const addLog = (message: string, type: 'info' | 'error' = 'info') => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { time, message, type }]);
    };

    // Handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            addLog(`파일 선택됨: ${e.target.files[0].name}`);
        }
    };

    const handleExtractSrt = async () => {
        if (!selectedFile) {
            toast.error("파일을 먼저 선택해주세요.");
            addLog("파일이 선택되지 않았습니다.", "error");
            return;
        }

        setIsProcessing(true);
        setStatusMessage("SRT 추출 중... (Whisper 모델 로딩)");
        setProgress(10);
        addLog("SRT 추출 요청 시작...");

        const formData = new FormData();
        const ext = selectedFile.name.split('.').pop() || 'mp3';
        const safeName = `upload_${Date.now()}_srt.${ext}`;
        const safeFile = new File([selectedFile], safeName, { type: selectedFile.type });

        formData.append('file', safeFile);
        formData.append('language', language);
        formData.append('model', subtitleModel);

        try {
            const interval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 1000);

            const res = await api.post('/tools/subtitle/extract', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            clearInterval(interval);
            setProgress(100);
            setStatusMessage("추출 완료!");
            setSrtContent(res.data.srt_content);
            toast.success("SRT 추출이 완료되었습니다.");
            addLog("SRT 추출 성공!");

        } catch (e: any) {
            console.error(e);
            let msg = e.response?.data?.detail || e.message;
            setStatusMessage("오류 발생: " + msg);
            toast.error("SRT 추출 실패: " + msg);
            addLog(`SRT 추출 실패: ${msg}`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLoadSrt = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.srt';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setSrtContent(e.target?.result as string);
                    addLog("SRT 파일 불러오기 완료");
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleAddMarkers = async () => {
        if (!originalScript) {
            toast.error("원본 대본을 먼저 입력해주세요.");
            addLog("원본 대본 없음", "error");
            return;
        }

        setIsProcessing(true);
        setStatusMessage("AI 의미 분절 분석 중...");
        addLog("AI 마커 추가 요청...");

        try {
            const res = await api.post('/tools/script/add-markers', {
                text: originalScript,
                provider: segmentProvider,
                model: segmentModel
            });

            if (res.data.text) {
                setOriginalScript(res.data.text);
                toast.success("의미 단위 분절 완료 (// 마커 추가됨)");
                addLog("AI 마커 추가 성공!");
            }
        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.detail || e.message;
            toast.error("AI 분절 실패: " + msg);
            addLog(`AI 분절 오류: ${msg}`, "error");
        } finally {
            setIsProcessing(false);
            setStatusMessage("");
        }
    };

    const handleRunConversion = async () => {
        addLog("변환 요청 시작...");
        console.log("Selected Language:", language);

        if (!srtContent) {
            toast.error("SRT 자막 내용이 필요합니다.");
            addLog("SRT 내용이 없습니다.", "error");
            return;
        }
        if (isAlignmentMode && !originalScript) {
            toast.error("대조 모드에서는 원본 대본이 필요합니다.");
            addLog("원본 대본이 없습니다.", "error");
            return;
        }

        setIsProcessing(true);
        setStatusMessage("변환 처리 중...");

        try {
            const res = await api.post('/tools/subtitle/align', {
                original_text: originalScript,
                srt_text: srtContent,
                limit: splitLimit,
                use_alignment: isAlignmentMode,
                use_marker_segmentation: isManualMarkerMode,
                language: language === 'auto' ? undefined : language
            });

            setResultStep1(res.data.step1 || "1단계 결과 없음");
            setResultStep2(res.data.step2 || "");
            setActiveTab('step2');
            setStatusMessage("변환 완료!");
            toast.success("자막 변환이 완료되었습니다.");
            addLog("변환 성공!");
        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.detail || e.message;
            toast.error("변환 실패: " + msg);
            addLog(`변환 오류: ${msg}`, "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveResult = (content: string, filename: string) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
        addLog(`SRT 파일 저장됨: ${filename}`);
    };

    return (
        <div className="flex flex-col h-full space-y-4 p-3 sm:p-6 pb-36 md:pb-10 bg-background text-foreground overflow-y-auto font-sans">
            {/* Header: File Drop Zone */}
            <div className="shrink-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-3.5 bg-muted/40 border border-dashed border-border rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                        <label className="cursor-pointer shrink-0">
                            <input
                                type="file"
                                accept="audio/*,video/*,.srt"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs hover:bg-primary/90 transition-all">
                                <FolderOpen className="w-3.5 h-3.5" />
                                파일 선택
                            </div>
                        </label>
                        <span className="text-xs text-muted-foreground truncate font-medium">
                            {selectedFile ? selectedFile.name : "선택된 파일 없음"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs bg-card border-border rounded-lg">
                                <SelectValue placeholder="언어 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="auto">🌐 자동 감지</SelectItem>
                                <SelectItem value="ko">🇰🇷 한국어</SelectItem>
                                <SelectItem value="en">🇺🇸 영어</SelectItem>
                                <SelectItem value="ja">🇯🇵 일본어</SelectItem>
                                <SelectItem value="zh">🇨🇳 중국어</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={subtitleModel} onValueChange={setSubtitleModel}>
                            <SelectTrigger className="w-full sm:w-[110px] h-8 text-xs bg-card border-border rounded-lg">
                                <SelectValue placeholder="모델 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="tiny">Tiny (초고속)</SelectItem>
                                <SelectItem value="base">Base (표준)</SelectItem>
                                <SelectItem value="small">Small (정확)</SelectItem>
                                <SelectItem value="medium">Medium (고품질)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Zone 2: Dual Editor Grid (Original Script + SRT Source) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[360px]">
                {/* Left Column: Original Script */}
                <Card className="flex flex-col h-full border border-border shadow-2xs rounded-2xl bg-card overflow-hidden">
                    <CardHeader className="py-2.5 px-3.5 sm:px-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 shrink-0">
                        <div className="flex items-center gap-2 text-foreground font-bold">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">Original Script</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col">
                        {/* Toolbar */}
                        <div className="p-2.5 border-b border-border bg-muted/10 flex flex-col gap-2">
                            {/* Row 1: Selectors */}
                            <div className="w-full">
                                <AIModelSelector
                                    provider={segmentProvider}
                                    onProviderChange={setSegmentProvider}
                                    model={segmentModel}
                                    onModelChange={setSegmentModel}
                                    compact={true}
                                    showPreset={false}
                                />
                            </div>

                            {/* Row 2: Actions */}
                            <div className="grid grid-cols-2 gap-2 w-full">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs font-semibold border-border text-foreground rounded-lg"
                                    onClick={() => {
                                        if (!originalScript) return;
                                        setOriginalScript(formatTextWithLineBreaks(originalScript));
                                        toast.success("문장 단위로 줄바꿈을 적용했습니다.");
                                    }}
                                    title="문장 끝(., ?, !)에서 줄바꿈"
                                >
                                    <WrapText className="w-3.5 h-3.5 mr-1.5" />
                                    자동 줄바꿈
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-300/50 dark:border-purple-700/50 font-bold transition-colors rounded-lg"
                                    onClick={handleAddMarkers}
                                    disabled={isProcessing}
                                >
                                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                    AI 분절 실행
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            value={originalScript}
                            onChange={(e) => setOriginalScript(e.target.value)}
                            placeholder="여기에 원본 대본을 붙여넣으세요... (// 로 수동 분절 가능)"
                            className="h-full min-h-[160px] resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 font-sans text-xs sm:text-sm leading-relaxed bg-background text-foreground placeholder:text-muted-foreground"
                        />
                    </CardContent>
                </Card>

                {/* Right Column: SRT Source */}
                <Card className="flex flex-col h-full border border-border shadow-2xs rounded-2xl bg-card overflow-hidden">
                    <CardHeader className="py-2.5 px-3.5 sm:px-4 border-b border-border bg-muted/30 flex flex-row items-center justify-between space-y-0 shrink-0">
                        <div className="flex items-center gap-2 text-foreground font-bold">
                            <Wand2 className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold uppercase tracking-wider">SRT Source</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleLoadSrt}
                                className="h-8 text-xs font-semibold border-border text-foreground rounded-lg px-2.5 sm:px-3"
                            >
                                📂 불러오기
                            </Button>
                            <Button
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-bold shadow-2xs rounded-lg px-2.5 sm:px-3"
                                onClick={handleExtractSrt}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Wand2 className="w-3.5 h-3.5 mr-1" />}
                                SRT 추출
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 flex flex-col">
                        <Textarea
                            value={srtContent}
                            onChange={(e) => setSrtContent(e.target.value)}
                            placeholder="SRT 자막 내용이 여기에 표시됩니다..."
                            className="flex-1 resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed bg-background text-foreground placeholder:text-muted-foreground"
                        />
                        {/* Footer: Progress */}
                        <div className="h-9 border-t border-border bg-muted/20 flex items-center px-3 sm:px-4 gap-3 text-xs font-medium text-muted-foreground shrink-0">
                            <div className="w-16 shrink-0 font-semibold">진행 상태:</div>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="w-10 text-right font-mono font-bold text-foreground shrink-0">{progress}%</div>
                            <div className="truncate text-right text-foreground max-w-[120px]">{statusMessage}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Zone 3: Control Strip */}
            <Card className="shrink-0 bg-card border border-border shadow-2xs rounded-2xl">
                <CardContent className="p-3.5 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
                    <div className="grid grid-cols-2 sm:flex items-center gap-3 sm:gap-6">
                        <div className="flex items-center gap-2.5 bg-muted/30 p-2 sm:p-0 rounded-xl">
                            <Switch
                                checked={isAlignmentMode}
                                onCheckedChange={(checked) => {
                                    setIsAlignmentMode(checked);
                                    if (!checked) setIsManualMarkerMode(false);
                                }}
                                id="align-mode"
                            />
                            <label htmlFor="align-mode" className="cursor-pointer select-none flex flex-col">
                                <span className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">대조 모드</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">대본+SRT</span>
                            </label>
                        </div>

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        <div className={`flex items-center gap-2.5 bg-muted/30 p-2 sm:p-0 rounded-xl transition-opacity ${!isAlignmentMode ? 'opacity-50' : ''}`}>
                            <Switch
                                checked={isManualMarkerMode}
                                onCheckedChange={setIsManualMarkerMode}
                                id="manual-marker-mode"
                                disabled={!isAlignmentMode}
                            />
                            <label htmlFor="manual-marker-mode" className={`cursor-pointer select-none flex flex-col ${!isAlignmentMode ? 'cursor-not-allowed' : ''}`}>
                                <span className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">수동 분절 모드</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">// 기호 분리</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1 md:max-w-md">
                        <div className={`flex items-center gap-3 flex-1 bg-muted/20 px-3 py-2 rounded-xl transition-opacity ${isManualMarkerMode ? 'opacity-50 pointer-events-none' : ''}`}>
                            <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">분할 기준:</span>
                            <Slider
                                value={[splitLimit]}
                                onValueChange={(vals) => setSplitLimit(vals[0])}
                                min={5}
                                max={50}
                                step={1}
                                className="flex-1"
                                disabled={isManualMarkerMode}
                            />
                            <span className="text-xs sm:text-sm font-mono font-bold w-10 text-right text-primary shrink-0">{splitLimit}자</span>
                        </div>

                        <Button
                            size="lg"
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 h-10 shadow-md transition-all active:scale-95 rounded-xl text-xs sm:text-sm shrink-0 flex items-center justify-center gap-2"
                            onClick={handleRunConversion}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            변환 실행
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Zone 4: Results & Logs */}
            <div className="flex-1 min-h-[300px] flex flex-col gap-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 shrink-0">
                        <TabsList className="bg-muted p-1 rounded-xl h-9 grid grid-cols-2 w-full sm:w-auto">
                            <TabsTrigger value="step1" className="text-xs px-3 py-1 font-bold">1단계: 시간 정렬</TabsTrigger>
                            <TabsTrigger value="step2" className="text-xs px-3 py-1 font-bold">2단계: 최종 SRT</TabsTrigger>
                        </TabsList>
                        {activeTab === 'step1' && (
                            <Button size="sm" variant="outline" onClick={() => handleSaveResult(resultStep1, 'step1_aligned.srt')} className="h-8 font-semibold text-xs border-border text-foreground rounded-lg self-end sm:self-auto">
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                .srt 파일 저장
                            </Button>
                        )}
                        {activeTab === 'step2' && (
                            <Button size="sm" variant="outline" onClick={() => handleSaveResult(resultStep2, 'final_output.srt')} className="h-8 font-semibold text-xs border-border text-foreground rounded-lg self-end sm:self-auto">
                                <Save className="w-3.5 h-3.5 mr-1.5" />
                                .srt 파일 저장
                            </Button>
                        )}
                    </div>

                    <TabsContent value="step1" className="flex-1 mt-0 min-h-[200px]">
                        <Card className="h-full border border-border shadow-2xs rounded-2xl overflow-hidden bg-card">
                            <CardContent className="p-0 h-full">
                                <Textarea
                                    value={resultStep1}
                                    readOnly
                                    className="h-full min-h-[200px] resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed text-foreground bg-background"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="step2" className="flex-1 mt-0 min-h-[200px]">
                        <Card className="h-full border border-border shadow-2xs rounded-2xl overflow-hidden bg-card">
                            <CardContent className="p-0 h-full">
                                <Textarea
                                    value={resultStep2}
                                    readOnly
                                    className="h-full min-h-[200px] resize-none border-0 focus-visible:ring-0 p-3 sm:p-4 font-mono text-xs sm:text-sm leading-relaxed text-foreground bg-background"
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* System Logs */}
                <div className="h-28 shrink-0 bg-card border border-border rounded-2xl p-3 overflow-y-auto font-mono text-xs text-foreground shadow-2xs">
                    <h3 className="text-xs font-bold mb-2 text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5 text-primary" />
                        System Logs
                    </h3>
                    <div className="space-y-1">
                        {logs.length === 0 && <div className="text-muted-foreground italic">No logs yet.</div>}
                        {logs.map((log, i) => (
                            <div key={i} className={log.type === 'error' ? 'text-rose-400' : 'text-emerald-400/90'}>
                                <span className="opacity-50 mr-2 text-muted-foreground">[{log.time}]</span>
                                {log.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubtitleConverter;
