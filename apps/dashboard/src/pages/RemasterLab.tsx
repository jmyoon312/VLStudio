import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, Mic2, Layers, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import axios from 'axios';

const RemasterLab = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    // Dubbing State
    const [targetLang, setTargetLang] = useState("en");

    // Enhancer State
    const [enhanceMode, setEnhanceMode] = useState("upscale"); // upscale | smooth
    const [scale, setScale] = useState("2");
    const [fps, setFps] = useState("60");



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResultUrl(null);
        }
    };

    const handleDubbing = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_lang', targetLang);

        try {
            const res = await axios.post('/api/lab/dubbing', formData);
            setResultUrl(res.data.url);
        } catch (error) {
            console.error(error);
            alert("더빙 생성에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleEnhance = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            let res;
            if (enhanceMode === 'upscale') {
                formData.append('scale', scale);
                res = await axios.post('/api/lab/upscale', formData);
            } else {
                formData.append('fps', fps);
                res = await axios.post('/api/lab/interpolate', formData);
            }
            setResultUrl(res.data.url);
        } catch (error) {
            console.error(error);
            alert("영상 향상 작업에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                    크리에이티브 실험실 (Beta)
                </h1>
                <p className="text-sm text-muted-foreground font-medium">영상의 화질 개선, 더빙 및 유튜브 연좌제 우회 필터 변조를 지원하는 실험 도구 모음입니다.</p>
            </div>

            <Tabs defaultValue="dubbing" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="dubbing">
                        <Mic2 className="w-4 h-4 mr-2" />
                        AI 더빙 (AI Dubbing)
                    </TabsTrigger>
                    <TabsTrigger value="enhance">
                        <Layers className="w-4 h-4 mr-2" />
                        영상 화질 개선 (Video Enhancer)
                    </TabsTrigger>
                </TabsList>

                {/* DUBBING TAB */}
                <TabsContent value="dubbing">
                    <Card className="border border-slate-200">
                        <CardHeader>
                            <CardTitle>AI 음성 더빙</CardTitle>
                            <CardDescription>영상 속 음성을 텍스트 분석 후 자연스럽게 다국어로 치환합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input type="file" accept="video/*" onChange={handleFileChange} />
                            </div>

                            <div className="flex gap-4 items-center">
                                <label className="text-sm font-medium text-slate-700">목표 언어:</label>
                                <Select value={targetLang} onValueChange={setTargetLang}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="언어 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">영어 (English)</SelectItem>
                                        <SelectItem value="ko">한국어 (Korean)</SelectItem>
                                        <SelectItem value="ja">일본어 (Japanese)</SelectItem>
                                        <SelectItem value="es">스페인어 (Spanish)</SelectItem>
                                        <SelectItem value="fr">프랑스어 (French)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button onClick={handleDubbing} disabled={!file || loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic2 className="mr-2 h-4 w-4" />}
                                더빙 생성 시작
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ENHANCE TAB */}
                <TabsContent value="enhance">
                    <Card className="border border-slate-200">
                        <CardHeader>
                            <CardTitle>영상 화질 및 프레임 개선</CardTitle>
                            <CardDescription>AI 모델을 사용하여 저화질 숏폼 비디오의 해상도 및 부드러운 움직임을 복원합니다.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input type="file" accept="video/*" onChange={handleFileChange} />
                            </div>

                            <div className="flex gap-4 items-center">
                                <label className="text-sm font-medium text-slate-700">모드:</label>
                                <Select value={enhanceMode} onValueChange={setEnhanceMode}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="upscale">4K 업스케일링</SelectItem>
                                        <SelectItem value="smooth">프레임 보간 (60fps)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {enhanceMode === 'upscale' && (
                                <div className="flex gap-4 items-center">
                                    <label className="text-sm font-medium text-slate-700">확대 배율:</label>
                                    <Select value={scale} onValueChange={setScale}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">x2 (HD → 4K)</SelectItem>
                                            <SelectItem value="4">x4 (SD → 4K)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {enhanceMode === 'smooth' && (
                                <div className="flex gap-4 items-center">
                                    <label className="text-sm font-medium text-slate-700">목표 FPS:</label>
                                    <Select value={fps} onValueChange={setFps}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="60">60 FPS</SelectItem>
                                            <SelectItem value="120">120 FPS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Button onClick={handleEnhance} disabled={!file || loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                개선 작업 시작
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>


            </Tabs>

            {/* RESULT PREVIEW */}
            {resultUrl && (
                <Card className="border border-slate-200 shadow-sm mt-6">
                    <CardHeader className="bg-slate-50/75 border-b border-slate-200">
                        <CardTitle className="text-slate-800 text-base">🛡️ 처리 완료 결과 영상 미리보기</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <video src={resultUrl} controls className="w-full max-h-[500px] rounded-lg border border-slate-200 bg-black shadow-inner" />
                        <div className="flex justify-center">
                            <a 
                                href={resultUrl} 
                                download 
                                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <Layers className="w-4 h-4 mr-2" />
                                결과 영상 다운로드
                            </a>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RemasterLab;
