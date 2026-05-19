import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Search, Split, Copy, Loader2, Lightbulb } from 'lucide-react';
import axios from 'axios';

const Insights = () => {
    const [script, setScript] = useState("");
    const [loading, setLoading] = useState(false);

    // Viral Score State
    const [viralResult, setViralResult] = useState<any>(null);

    // SEO State
    const [seoKeywords, setSeoKeywords] = useState("");
    const [seoResult, setSeoResult] = useState<any[] | null>(null);

    // A/B Test State
    const [projectId, setProjectId] = useState("");
    const [hooks, setHooks] = useState("");
    const [abResult, setAbResult] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!script) return;
        setLoading(true);
        try {
            const res = await axios.post('/insights/analyze-virality', {
                content: script,
                type: 'script'
            });
            setViralResult(res.data);
        } catch (error) {
            console.error(error);
            alert("분석에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSEO = async () => {
        if (!script) return;
        setLoading(true);
        try {
            const res = await axios.post('/insights/generate-seo', {
                content: script,
                keywords: seoKeywords
            });
            setSeoResult(res.data);
        } catch (error) {
            console.error(error);
            alert("SEO 생성에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAB = async () => {
        if (!projectId || !hooks) return;
        setLoading(true);
        try {
            const hookList = hooks.split('\n').filter(h => h.trim());
            const res = await axios.post('/insights/ab-test', {
                project_id: projectId,
                hooks: hookList
            });
            setAbResult(`성공! ${res.data.variants_created}개의 변형이 렌더링 대기열에 추가되었습니다.`);
        } catch (error) {
            console.error(error);
            alert("A/B 테스트 생성에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Pure Insight Analysis */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* INPUT SECTION */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>콘텐츠 분석</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="여기에 영상 대본이나 요약을 붙여넣으세요..."
                            className="h-64"
                            value={script}
                            onChange={e => setScript(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleAnalyze} disabled={loading || !script} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                                바이럴 가능성 분석
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* VIRAL SCORE RESULT */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>바이럴 점수</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {viralResult ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-center">
                                    <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-gray-100">
                                        <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{ clipPath: `inset(0 0 ${100 - viralResult.score}% 0)` }}></div>
                                        <div className="text-4xl font-bold text-green-600">{viralResult.score}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500">후킹</div>
                                        <div className="text-xl font-bold">{viralResult.metrics.hook}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500">유지력</div>
                                        <div className="text-xl font-bold">{viralResult.metrics.retention}</div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <div className="text-sm text-gray-500">공유성</div>
                                        <div className="text-xl font-bold">{viralResult.metrics.shareability}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                                        AI 조언
                                    </h4>
                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                        {viralResult.advice.map((tip: string, i: number) => (
                                            <li key={i}>{tip}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                분석을 실행하여 점수를 확인하세요
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="seo" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="seo">
                        <Search className="w-4 h-4 mr-2" />
                        SEO 생성기
                    </TabsTrigger>
                    <TabsTrigger value="ab">
                        <Split className="w-4 h-4 mr-2" />
                        A/B 테스트
                    </TabsTrigger>
                </TabsList>

                {/* SEO TAB */}
                <TabsContent value="seo">
                    <Card>
                        <CardHeader>
                            <CardTitle>SEO 메타데이터 생성</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="타겟 키워드 (쉼표로 구분)"
                                    value={seoKeywords}
                                    onChange={e => setSeoKeywords(e.target.value)}
                                />
                                <Button onClick={handleGenerateSEO} disabled={loading || !script}>
                                    생성하기
                                </Button>
                            </div>

                            {seoResult && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    {seoResult.map((item, i) => (
                                        <div key={i} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                                            <div className="font-bold text-purple-600">{item.strategy}</div>
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase">제목</div>
                                                <div className="font-medium text-sm">{item.title}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase">설명</div>
                                                <div className="text-xs text-gray-600 line-clamp-3">{item.description}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase">태그</div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {item.tags.slice(0, 5).map((tag: string, j: number) => (
                                                        <span key={j} className="text-[10px] bg-white border px-1 rounded">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => navigator.clipboard.writeText(JSON.stringify(item, null, 2))}>
                                                <Copy className="w-3 h-3 mr-2" /> JSON 복사
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* A/B TEST TAB */}
                <TabsContent value="ab">
                    <Card>
                        <CardHeader>
                            <CardTitle>A/B 테스트 생성기</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">프로젝트 ID (또는 JSON 경로)</label>
                                <Input
                                    placeholder="예: my-project-id"
                                    value={projectId}
                                    onChange={e => setProjectId(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">후킹 문구 (한 줄에 하나씩)</label>
                                <Textarea
                                    placeholder="후킹 1: 믿을 수 없는 사실...&#10;후킹 2: 비밀을 알려드립니다..."
                                    className="h-32"
                                    value={hooks}
                                    onChange={e => setHooks(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleGenerateAB} disabled={loading || !projectId || !hooks} className="w-full">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Split className="mr-2 h-4 w-4" />}
                                변형 생성하기
                            </Button>
                            {abResult && (
                                <div className="p-4 bg-green-50 text-green-700 rounded-lg text-center">
                                    {abResult}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default Insights;
