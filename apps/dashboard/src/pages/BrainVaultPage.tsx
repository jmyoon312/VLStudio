import React, { useState, useEffect } from 'react';
import { 
    BrainCircuit, Sparkles, BookOpen, Save, RefreshCcw, 
    ShieldCheck, Lightbulb, Check 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

export const BrainVaultPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'soul' | 'memory' | 'skills'>('soul');
    const [soul, setSoul] = useState('');
    const [memory, setMemory] = useState('');
    const [skills, setSkills] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const loadMemoryData = async () => {
        try {
            const res = await api.get('/agent/memory');
            setSoul(res.data?.soul || '');
            setMemory(res.data?.memory || '');
            setSkills(res.data?.skills || []);
        } catch (err: any) {
            toast.error("스튜디오 기억고 로드 실패: " + err.message);
        }
    };

    useEffect(() => {
        loadMemoryData();
    }, []);

    const handleSaveSoul = async () => {
        setIsSaving(true);
        try {
            await api.put('/agent/memory/soul', { content: soul });
            toast.success("루피의 정체성(soul.md)이 성공적으로 갱신되었습니다.");
        } catch (err: any) {
            toast.error("저장 실패: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <BrainCircuit className="w-7 h-7 text-indigo-600" />
                        스튜디오 브레인 & 기억고 (Brain Vault)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        루피의 제작 철학(soul.md), 사용자 취향 및 누적 학습 기억(memory.md), 바이럴 후킹 플레이북(skills/)을 관리합니다.
                    </p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-border pb-3">
                <Button
                    size="sm"
                    variant={activeTab === 'soul' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('soul')}
                    className="text-xs font-bold"
                >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    디렉팅 철학 및 정체성 (soul.md)
                </Button>
                <Button
                    size="sm"
                    variant={activeTab === 'memory' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('memory')}
                    className="text-xs font-bold"
                >
                    <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                    누적 학습 기억 (memory.md)
                </Button>
                <Button
                    size="sm"
                    variant={activeTab === 'skills' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('skills')}
                    className="text-xs font-bold"
                >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                    후킹 스킬 플레이북 (skills/)
                </Button>
            </div>

            {activeTab === 'soul' && (
                <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border py-3.5 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground">루피 디렉팅 정체성 (soul.md)</CardTitle>
                            <CardDescription className="text-xs">루피가 대본을 작성하거나 명령을 수행할 때 반드시 지켜야 할 바이럴 제작 10대 원칙</CardDescription>
                        </div>
                        <Button 
                            size="sm" 
                            disabled={isSaving}
                            onClick={handleSaveSoul}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-xs"
                        >
                            <Save className="w-3.5 h-3.5 mr-1" />
                            저장하기
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4">
                        <textarea
                            value={soul}
                            onChange={(e) => setSoul(e.target.value)}
                            rows={16}
                            className="w-full p-4 bg-muted/20 border border-border/80 rounded-xl text-xs font-mono leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y"
                        />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'memory' && (
                <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                        <CardTitle className="text-sm font-bold text-foreground">누적 학습 기억 및 사용자 취향 (memory.md)</CardTitle>
                        <CardDescription className="text-xs">채널 운영 과정에서 축적된 떡상 공식과 반복 피드백 노하우</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <textarea
                            value={memory}
                            readOnly
                            rows={16}
                            className="w-full p-4 bg-muted/20 border border-border/80 rounded-xl text-xs font-mono leading-relaxed text-foreground focus:outline-none resize-y"
                        />
                    </CardContent>
                </Card>
            )}

            {activeTab === 'skills' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {skills.map((s, idx) => (
                        <Card key={idx} className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                            <CardHeader className="p-4 bg-muted/30 border-b border-border">
                                <CardTitle className="text-xs font-black text-foreground font-mono">{s.filename}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <pre className="text-[11px] font-mono whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                    {s.content}
                                </pre>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BrainVaultPage;
