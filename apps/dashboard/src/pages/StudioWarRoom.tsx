import React, { useState, useEffect } from 'react';
import { 
    Cpu, Activity, Play, CheckCircle2, AlertCircle, RefreshCcw, 
    Sparkles, ArrowRight, ShieldCheck, Zap, Layers, Users, GitBranch 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';

interface WorkerState {
    id: string;
    role: string;
    name: string;
    status: 'idle' | 'working' | 'ready';
    task: string;
    model: string;
}

const WORKERS_INIT: WorkerState[] = [
    { id: 'w1', role: '트렌드 스카우터', name: 'Scout-Alpha', status: 'ready', task: '급상승 채널 DNA 및 떡상 시그널 감지 대기', model: 'viraloop1' },
    { id: 'w2', role: '대본 기획자', name: 'Writer-Pro', status: 'ready', task: '3초 후킹 및 9-Wave 바이럴 각색 대기', model: 'viraloop1' },
    { id: 'w3', role: '바이럴 비평가', name: 'Critic-85', status: 'ready', task: '후킹 점수(85점 이상) 및 퀄리티 게이트 검수', model: 'viraloop1' },
    { id: 'w4', role: '사운드 디렉터', name: 'Voice-Sync', status: 'ready', task: 'MultiTTS 성우 매핑 및 BGM 비트 싱크', model: 'System TTS' },
    { id: 'w5', role: '비주얼 디렉터', name: 'Flow-Artist', status: 'ready', task: 'Google Flow AI 비디오/이미지 렌더 대기', model: 'Flow 2.0' },
    { id: 'w6', role: '스마트 컷터', name: 'Smart-Cutter', status: 'ready', task: '무음 제거 및 씬 전환 포인트 자동 절삭', model: 'FFmpeg Core' },
    { id: 'w7', role: '캡컷 조립기', name: 'CapCut-Assembler', status: 'ready', task: '타임라인 멀티트랙 No-ZIP 무손실 패키징', model: 'Native Bridge' },
    { id: 'w8', role: '배포 관리자', name: 'Queue-Deployer', status: 'ready', task: 'WorkQueue 적재 및 멀티채널 예약 발행', model: 'WorkQueue v2' },
];

export const StudioWarRoom: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerState[]>(WORKERS_INIT);
    const [activeMission, setActiveMission] = useState<string | null>(null);
    const [isRunning, setIsRunning] = useState(false);

    const handleRunPreset = async (presetName: string, pipelineId: string) => {
        setIsRunning(true);
        setActiveMission(presetName);
        toast.info(`'${presetName}' 파이프라인 가동을 시작합니다.`);

        // Update worker statuses to working
        setWorkers(prev => prev.map((w, idx) => ({
            ...w,
            status: idx < 3 ? 'working' : 'ready',
            task: idx === 0 ? '바이럴 소스 분석 및 메타데이터 수집 중' : w.task
        })));

        try {
            const res = await api.post(`/pipelines/${pipelineId}/run`, { topic: presetName });
            toast.success(res.data?.message || `'${presetName}' 파이프라인이 정상 투입되었습니다.`);
        } catch (err: any) {
            toast.error(`가동 실패: ${err.message}`);
        } finally {
            setTimeout(() => {
                setIsRunning(false);
                setWorkers(WORKERS_INIT);
            }, 5000);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-7 h-7 text-blue-200" />
                        <h1 className="text-2xl font-black tracking-tight">스튜디오 워룸 (Studio War Room)</h1>
                        <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30 font-bold">
                            실시간 자율 관제
                        </Badge>
                    </div>
                    <p className="text-xs text-blue-100 max-w-2xl font-medium leading-relaxed">
                        8인의 전문 AI 워커들이 24시간 교대 근무하는 가상 프로덕션 오피스입니다. 
                        쇼츠 및 롱폼 파이프라인을 원클릭으로 가동하고 각 워커의 작업 현황을 실시간으로 관제합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.dispatchEvent(new CustomEvent('OPEN_LOOPIE'))}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs"
                    >
                        <Sparkles className="w-4 h-4 mr-1.5 text-yellow-300" />
                        루피에게 명령하기
                    </Button>
                </div>
            </div>

            {/* 6 Standard Production Pipelines Launcher */}
            <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            6대 표준 영상 제작 파이프라인 즉시 출격
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-bold">원클릭 일괄 제작</Badge>
                    </div>
                    <CardDescription className="text-xs">
                        쇼츠(원테이크, 비트싱크, 대본해설, 컷팅, Flow창작)부터 롱폼까지 원클릭으로 8인 워커에게 배치합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { id: 'one_take_hook', name: '1. 원테이크 퀵후킹형', tag: '숏폼 초고속', desc: '해외 영상 상하단 블러 + 3초 후킹 자막 고속 양산' },
                        { id: 'music_beat_sync', name: '2. 음악 비트싱크형', tag: '감성/패션', desc: '무음 컷팅 + 트렌드 BGM 비트 매핑 + 필터' },
                        { id: 'script_commentary', name: '3. 대본 해설/리캡형', tag: '경제/시사', desc: 'Whisper 음성 추출 ➔ AI 각색 ➔ MultiTTS 보이스' },
                        { id: 'movie_drama_highlight', name: '4. 영화/드라마 컷팅형', tag: '리뷰/하이라이트', desc: 'SceneCutter 30초 명장면 추출 + 결말 해설' },
                        { id: 'full_generative_ai', name: '5. AI 완전 창작 생성형', tag: '야담/판타지', desc: 'Google Flow AI 비디오 렌더 + 스토리텔링 캡컷 조립' },
                        { id: 'hybrid_longform', name: '6. 하이브리드 멀티소스 롱폼', tag: '5~15분 롱폼', desc: '수집 컷 + Flow AI 씬 다중 트랙 교차 조립' },
                    ].map((pipe) => (
                        <div key={pipe.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col justify-between gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="text-xs font-black text-foreground">{pipe.name}</h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold">{pipe.tag}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{pipe.desc}</p>
                            </div>
                            <Button 
                                size="sm"
                                disabled={isRunning}
                                onClick={() => handleRunPreset(pipe.name, pipe.id)}
                                className="w-full text-xs font-bold h-8 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                            >
                                <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                                파이프라인 가동
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 8 Specialized Workers Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        8인의 전문 워커 에이전트 근무 현황
                    </h3>
                    <span className="text-xs text-muted-foreground">OmniRoute viraloop1 동기화 활성</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {workers.map((w) => (
                        <Card key={w.id} className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                            <CardHeader className="p-3.5 bg-muted/30 border-b border-border">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-[10px] font-bold font-mono">
                                        {w.name}
                                    </Badge>
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                                        <span className={`w-2 h-2 rounded-full ${w.status === 'working' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                                        <span className={w.status === 'working' ? 'text-amber-600' : 'text-emerald-600'}>
                                            {w.status === 'working' ? '작업 중' : '대기 완료'}
                                        </span>
                                    </span>
                                </div>
                                <CardTitle className="text-xs font-black mt-1 text-foreground">{w.role}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3.5 space-y-2">
                                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {w.task}
                                </p>
                                <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                                    <span>지능 두뇌:</span>
                                    <span className="font-bold text-foreground">{w.model}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudioWarRoom;
