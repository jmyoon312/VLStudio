import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wand2, Mic2, Layers } from 'lucide-react';
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
            const res = await axios.post('/lab/dubbing', formData);
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
                res = await axios.post('/lab/upscale', formData);
            } else {
                formData.append('fps', fps);
                res = await axios.post('/lab/interpolate', formData);
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
            {/* AI Asset Transformation Interface */}

            <Tabs defaultValue="dubbing" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
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
                    <Card>
                        <CardHeader>
                            <CardTitle>AI 음성 더빙</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input type="file" accept="video/*" onChange={handleFileChange} />
                            </div>

                            <div className="flex gap-4 items-center">
                                <label className="text-sm font-medium">목표 언어:</label>
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

                            <Button onClick={handleDubbing} disabled={!file || loading} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic2 className="mr-2 h-4 w-4" />}
                                더빙 생성 시작
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ENHANCE TAB */}
                <TabsContent value="enhance">
                    <Card>
                        <CardHeader>
                            <CardTitle>영상 화질 및 프레임 개선</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Input type="file" accept="video/*" onChange={handleFileChange} />
                            </div>

                            <div className="flex gap-4 items-center">
                                <label className="text-sm font-medium">모드:</label>
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
                                    <label className="text-sm font-medium">확대 배율:</label>
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
                                    <label className="text-sm font-medium">목표 FPS:</label>
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

                            <Button onClick={handleEnhance} disabled={!file || loading} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                개선 작업 시작
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* RESULT PREVIEW */}
            {resultUrl && (
                <Card>
                    <CardHeader>
                        <CardTitle>결과물</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <video src={resultUrl} controls className="w-full rounded-lg border border-gray-200" />
                        <div className="mt-2 text-center">
                            <a href={resultUrl} download className="text-blue-600 hover:underline text-sm">결과물 다운로드</a>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default RemasterLab;
