import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Radio, Clock, Send, ShieldCheck, Zap, RefreshCcw, 
    Sparkles, Terminal, Smartphone, MessageSquare, Activity,
    ArrowUpRight, AlertOctagon, CheckCircle2, ShieldAlert, Cpu,
    TrendingUp, Calendar, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

interface PatrolLog {
    id: string;
    timestamp: string;
    type: 'info' | 'success' | 'warning' | 'telegram';
    message: string;
}

const INITIAL_LOGS: PatrolLog[] = [
    { id: '1', timestamp: '08:30:00', type: 'info', message: '🤖 [Cron Engine] 정기 오전 자율 순찰 스케줄 가동' },
    { id: '2', timestamp: '08:30:05', type: 'info', message: '📡 [Scout Worker] 틱톡/유튜브 급상승 쇼츠 120개 영상 데이터 인제스트' },
    { id: '3', timestamp: '08:30:42', type: 'success', message: '⚡ [FTS5 Search] 과거 떡상 패턴과의 코사인 유사도 92% 매칭' },
    { id: '4', timestamp: '08:31:10', type: 'telegram', message: '📱 [Telegram] 모바일 텔레그램으로 3대 바이럴 급상승 리포트 전송 완료' },
    { id: '5', timestamp: '08:31:15', type: 'success', message: '🏆 [Auto-Skill] 91점 후킹 스킬 (viral_3sec_punch.md) 자동 생성 및 각인 완료' }
];

export const AutonomousPatrolPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [testMessage, setTestMessage] = useState('🚀 [ViraLoop Studio] Hermes 원격 관제 실시간 테스트 메시지입니다.');
    const [logs, setLogs] = useState<PatrolLog[]>(INITIAL_LOGS);
    const [logFilter, setLogFilter] = useState<'all' | 'success' | 'telegram'>('all');

    // Fetch Patrol Status
    const { data: patrolStatus, isLoading, refetch } = useQuery({
        queryKey: ['cron_patrol_status'],
        queryFn: async () => {
            const res = await api.get('/system/cron-patrol/status');
            return res.data;
        },
        refetchInterval: 10000
    });

    // Fetch Global Arbiter Status
    const { data: arbiterStatus, refetch: refetchArbiter } = useQuery({
        queryKey: ['global_arbiter_status'],
        queryFn: async () => {
            const res = await api.get('/brand-channels/directors/arbiter-status');
            return res.data;
        },
        refetchInterval: 8000
    });

    const triggerPatrolMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/cron-patrol/trigger');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || '자율 순찰이 즉시 가동되었습니다.');
            const newLog: PatrolLog = {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleTimeString(),
                type: 'info',
                message: '🛰️ [Manual Trigger] 사용자에 의한 즉시 무인 순찰 론칭'
            };
            setLogs(prev => [newLog, ...prev]);
            refetch();
        },
        onError: (err: any) => {
            toast.error('순찰 가동 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const killSwitchMutation = useMutation({
        mutationFn: async (activate: boolean) => {
            const res = await api.post(`/brand-channels/directors/kill-switch?activate=${activate}`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            refetchArbiter();
        },
        onError: (err: any) => {
            toast.error('킬스위치 제어 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const sendTelegramMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/system/telegram/test-send', { message: testMessage });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || '텔레그램 발송 성공!');
            const newLog: PatrolLog = {
                id: Date.now().toString(),
                timestamp: new Date().toLocaleTimeString(),
                type: 'telegram',
                message: `📱 [Telegram Dispatch] "${testMessage}" 스마트폰 전송 완료`
            };
            setLogs(prev => [newLog, ...prev]);
        },
        onError: (err: any) => {
            toast.error('텔레그램 발송 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const filteredLogs = logs.filter(l => {
        if (logFilter === 'all') return true;
        if (logFilter === 'success') return l.type === 'success';
        if (logFilter === 'telegram') return l.type === 'telegram';
        return true;
    });

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                    자율 순찰 & 원격 관제실 (Autonomous Patrol)
                                </h1>
                                <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-500 border-indigo-500/30 font-bold">
                                    Tier 1 총사령탑
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                루피 총사령탑의 24시간 무인 트렌드 발굴 순찰과 모바일 텔레그램 스마트폰 결재 센터를 총괄 제어합니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { refetch(); refetchArbiter(); }}
                        className="text-xs font-bold gap-1.5 rounded-xl h-9"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        상태 갱신
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => triggerPatrolMutation.mutate()}
                        disabled={triggerPatrolMutation.isPending}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm rounded-xl h-9"
                    >
                        <Zap className={`w-3.5 h-3.5 ${triggerPatrolMutation.isPending ? 'animate-spin' : ''}`} />
                        {triggerPatrolMutation.isPending ? '순찰 가동 중...' : '즉시 1회 순찰 가동'}
                    </Button>
                </div>
            </div>

            {/* Tier 1 Global Arbiter Realtime Status Banner */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-500" />
                        <span className="font-bold text-foreground">GPU 세마포어:</span>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {arbiterStatus?.gpu_semaphore?.active_slots ?? 0} / {arbiterStatus?.gpu_semaphore?.max_slots ?? 2} 슬롯 가동
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-foreground">API 예산 보호:</span>
                        <span className="text-muted-foreground font-mono">
                            ${arbiterStatus?.api_budget?.used_today ?? 0} / ${arbiterStatus?.api_budget?.daily_limit ?? 50}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">프록시 지터:</span>
                        <span className="text-muted-foreground font-mono">{arbiterStatus?.proxy_jitter?.jitter_window ?? '5.0s ~ 8.0s'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {arbiterStatus?.kill_switch_active ? (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => killSwitchMutation.mutate(false)}
                            className="h-7 text-xs font-bold rounded-lg gap-1"
                        >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            킬스위치 해제
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => killSwitchMutation.mutate(true)}
                            className="h-7 text-xs font-bold border-rose-500/30 text-rose-600 hover:bg-rose-500/10 rounded-lg gap-1"
                        >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            비상 킬스위치 작동
                        </Button>
                    )}
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">자율 순찰 데몬</span>
                            <div className="text-lg font-black text-foreground flex items-center gap-2">
                                {patrolStatus?.enabled ? '● 24시간 가동 중' : '○ 대기 중'}
                            </div>
                            <span className="text-[10px] text-emerald-500 font-mono">
                                스케줄: {patrolStatus?.schedule || '08:30, 18:30'}
                            </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">텔레그램 원격 관제</span>
                            <div className="text-lg font-black text-foreground flex items-center gap-2">
                                {patrolStatus?.telegram_connected ? (
                                    <span className="text-emerald-600 dark:text-emerald-400">● 연결 정상</span>
                                ) : (
                                    <span className="text-amber-500">○ 미연결 (토큰 필요)</span>
                                )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">스마트폰 푸시 & 원격 명령</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
                            <Smartphone className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">오늘 무인 발굴 영상</span>
                            <div className="text-lg font-black text-foreground font-mono">
                                {patrolStatus?.videos_scouted_today ?? 28} <span className="text-xs font-normal text-muted-foreground">편</span>
                            </div>
                            <span className="text-[10px] text-emerald-500">퀀트 레이더 랭킹 탑재</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">자동 민팅 스킬</span>
                            <div className="text-lg font-black text-foreground font-mono">
                                {patrolStatus?.skills_minted_today ?? 3} <span className="text-xs font-normal text-muted-foreground">개</span>
                            </div>
                            <span className="text-[10px] text-indigo-500">Hermes 기억고 즉시 각인</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                            <Zap className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 24-Hour Autonomous Operational Timeline */}
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="border-b border-border/80 pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" />
                            루피 24시 자율 순찰 & 양산 라이프사이클 (24h Autonomous Timeline)
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] font-bold text-indigo-500 border-indigo-500/30">
                            100% 무인 자동화
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { time: '08:30', title: '조간 바이럴 트렌드 스카우트', desc: '글로벌 틱톡 및 유튜브 인기 급상승 120개 영상 데이터 인제스트 및 떡상 DNA 추출', color: 'border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400' },
                            { time: '13:00', title: '축2 5대 모드 매칭 & 대본 검수', desc: '채널 주권 DNA 결합 후 Critic-85 퀄리티 게이트 검수 통과 (85점 미달 시 자동 재생성)', color: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400' },
                            { time: '18:30', title: '골든타임 렌더 & 자동 배포', desc: 'GlobalArbiter GPU 세마포어 통과 ➔ CapCut No-ZIP 조립 ➔ 채널 큐 자동 배포', color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
                            { time: '23:00', title: '일일 결산 & Auto-Skill 민팅', desc: '당일 조회수/반응도 결산 후 승리 공식을 SKILL.md로 자동 민팅하여 Hermes FTS5에 영구 각인', color: 'border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400' },
                        ].map((item, idx) => (
                            <div key={idx} className={`p-3.5 rounded-2xl border ${item.color} space-y-1.5`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-background/80 border border-current">
                                        {item.time}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground">단계 {idx + 1}</span>
                                </div>
                                <div className="text-xs font-bold text-foreground">{item.title}</div>
                                <div className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Radar & Telegram Remote Dual Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
                    <CardHeader className="border-b border-border/80 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                자율 트렌드 순찰 레이더 (Scout Engine)
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-bold text-indigo-500 border-indigo-500/30">
                                24채널 백그라운드 스캔
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            설정된 주기마다 틱톡/유튜브 쇼츠 급상승 랭킹을 자동 순찰하고 바이럴 DNA를 분석합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">마지막 순찰 시각:</span>
                                <span className="font-mono font-bold text-foreground">{patrolStatus?.last_patrol_at || '오늘 08:30:00'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">다음 예정 순찰:</span>
                                <span className="font-mono font-bold text-indigo-500">{patrolStatus?.next_patrol_at || '오늘 18:30:00'}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">순찰 타겟:</span>
                                <span className="font-medium text-foreground">글로벌 틱톡 쇼츠, 유튜브 인기 급상승</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">자동 조치:</span>
                                <span className="font-medium text-emerald-500">85점 초과 시 인큐베이터 자동 적재</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20 text-xs">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                                <span>Cron 스케줄 변경은 <b>[운영·설정 ➔ 환경설정]</b>에서 제어 가능합니다.</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate('/settings')} 
                                className="h-6 text-[11px] text-indigo-600 dark:text-indigo-400 gap-1 px-2 font-bold hover:bg-indigo-500/10"
                            >
                                환경설정 이동 <ArrowUpRight className="w-3 h-3" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-xs flex flex-col justify-between">
                    <CardHeader className="border-b border-border/80 pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-sky-500" />
                                텔레그램 원격 지휘 타워 (Telegram Remote)
                            </CardTitle>
                            <Badge variant="outline" className="text-[10px] font-bold text-sky-500 border-sky-500/30">
                                스마트폰 실시간 결재/제어
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            파이프라인 제작 승인/반려(HITL), 완료 알림 및 비상 경보를 모바일 텔레그램으로 즉시 수신 및 지휘합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {!patrolStatus?.telegram_connected && (
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                                <span className="text-amber-600 dark:text-amber-400 font-medium">스마트폰 푸시를 받으려면 봇 토큰과 챗 ID 연동이 필요합니다.</span>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => navigate('/settings')} 
                                    className="h-6 text-[11px] font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 gap-1 px-2"
                                >
                                    연동하기 <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                                테스트 메시지 전송
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={testMessage}
                                    onChange={(e) => setTestMessage(e.target.value)}
                                    placeholder="전송할 테스트 메시지를 입력하세요"
                                    className="h-9 text-xs"
                                />
                                <Button
                                    size="sm"
                                    onClick={() => sendTelegramMutation.mutate()}
                                    disabled={sendTelegramMutation.isPending}
                                    className="h-9 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shrink-0 gap-1.5"
                                >
                                    <Send className={`w-3.5 h-3.5 ${sendTelegramMutation.isPending ? 'animate-spin' : ''}`} />
                                    전송
                                </Button>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20 text-xs text-muted-foreground space-y-1">
                            <div className="font-bold text-foreground">💡 텔레그램 스마트폰 실시간 지휘 명령어:</div>
                            <div>• <code>/status</code> : 현재 GPU 세마포어 및 채널 디렉터 상태 조회</div>
                            <div>• <code>/approve [작업ID]</code> : 텔레그램 HITL 게이트 승인 ➔ 렌더 착수</div>
                            <div>• <code>/reject [작업ID]</code> : 대본 반려 ➔ Critic-85 피드백 재작성</div>
                            <div>• <code>/kill</code> : 긴급 킬스위치 즉시 발동 및 전 채널 정지</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Event Log Console */}
            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="border-b border-border/80 py-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                            <CardTitle className="text-sm font-bold">실시간 자율 순찰 & 관제 이벤트 로그</CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant={logFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('all')}
                                className="h-7 text-[11px] px-2.5 rounded-lg"
                            >
                                전체 로그
                            </Button>
                            <Button
                                size="sm"
                                variant={logFilter === 'success' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('success')}
                                className="h-7 text-[11px] px-2.5 rounded-lg"
                            >
                                스킬/성과만
                            </Button>
                            <Button
                                size="sm"
                                variant={logFilter === 'telegram' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('telegram')}
                                className="h-7 text-[11px] px-2.5 rounded-lg"
                            >
                                텔레그램 발송
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 font-mono text-xs space-y-2 max-h-64 overflow-y-auto bg-black/20 dark:bg-black/40 rounded-b-2xl">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="flex items-start gap-3 py-1 border-b border-border/40 last:border-0">
                                <span className="text-muted-foreground/60 text-[11px] shrink-0 font-bold">[{log.timestamp}]</span>
                                <span className={
                                    log.type === 'success' ? 'text-emerald-400 font-medium' :
                                    log.type === 'telegram' ? 'text-sky-400 font-medium' :
                                    log.type === 'warning' ? 'text-amber-400 font-medium' :
                                    'text-foreground/80'
                                }>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AutonomousPatrolPage;
