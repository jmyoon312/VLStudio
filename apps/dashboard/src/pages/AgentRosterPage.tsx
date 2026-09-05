import React, { useState, useEffect } from 'react';
import { Users, Cpu, ShieldCheck, Sparkles, Save, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

const DEFAULT_ROSTER = [
    { id: 'scout', name: '트렌드 스카우터', desc: '채널 DNA 발굴 및 떡상 영상 탐지', model: 'viraloop1', temp: 0.7 },
    { id: 'writer', name: '대본 기획자', name_en: 'Script Writer', desc: '9-Wave 바이럴 각색 및 3초 후킹 대본', model: 'viraloop1', temp: 0.8 },
    { id: 'critic', name: '바이럴 비평가', desc: '85점 품질 검수 및 팩트 체크', model: 'viraloop1', temp: 0.3 },
    { id: 'voice', name: '사운드 디렉터', desc: 'MultiTTS 성우 보이스 및 BGM 믹싱', model: 'MultiTTS Engine', temp: 0.5 },
    { id: 'visual', name: '비주얼 아트 디렉터', desc: 'Google Flow AI 프롬프트 렌더링', model: 'Google Flow AI', temp: 0.7 },
    { id: 'cutter', name: '스마트 컷터', desc: 'SceneCutter 씬 분할 및 무음 컷팅', model: 'FFmpeg Core', temp: 0.2 },
    { id: 'assembler', name: '캡컷 조립기', desc: 'CapCut 프로젝트 No-ZIP 조립', model: 'Native Bridge', temp: 0.1 },
    { id: 'deployer', name: '배포 관리자', desc: 'WorkQueue 적재 및 멀티채널 예약 발행', model: 'WorkQueue Engine', temp: 0.2 },
];

export const AgentRosterPage: React.FC = () => {
    const [roster, setRoster] = useState(DEFAULT_ROSTER);

    const handleSave = () => {
        toast.success("에이전트 인력소 설정이 성공적으로 저장되었습니다.");
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        에이전트 인력소 & 모델 설정 (Agent Roster)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        스튜디오를 구성하는 8인의 전문 워커 에이전트에게 개별 AI 모델(OmniRoute viraloop1 등)과 창의성 온도를 지정합니다.
                    </p>
                </div>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs">
                    <Save className="w-3.5 h-3.5 mr-1" />
                    설정 저장
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roster.map((worker) => (
                    <Card key={worker.id} className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                        <CardHeader className="p-4 bg-muted/30 border-b border-border">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-black text-foreground">{worker.name}</CardTitle>
                                <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-mono">
                                    {worker.model}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs mt-1">{worker.desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground font-semibold">할당 인공지능 두뇌:</span>
                                <input
                                    type="text"
                                    value={worker.model}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setRoster(prev => prev.map(w => w.id === worker.id ? { ...w, model: val } : w));
                                    }}
                                    className="px-2.5 py-1 bg-muted/40 border border-border/80 rounded-lg text-xs font-mono text-foreground font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 text-right"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default AgentRosterPage;
