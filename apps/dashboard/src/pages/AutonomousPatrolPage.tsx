import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Radio, Clock, Send, ShieldCheck, Zap, RefreshCcw, 
    Sparkles, Terminal, Smartphone, MessageSquare, Activity,
    ArrowUpRight, Settings
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

    const { data: patrolStatus, isLoading, refetch } = useQuery({
        queryKey: ['cron_patrol_status'],
        queryFn: async () => {
            const res = await api.get('/system/cron-patrol/status');
            return res.data;
        },
        refetchInterval: 10000
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2.5 text-foreground">
                        <Radio className="w-7 h-7 text-indigo-500 animate-pulse" />
                        자율 순찰 & 원격 관제실 (Autonomous Patrol)
                    </h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        내장 Cron 엔진의 24시간 무인 트렌드 스카우팅 일정과 모바일 텔레그램 원격 지휘 타워를 실시간 통제합니다.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="text-xs font-bold gap-1.5"
                    >
                        <RefreshCcw className="w-3.5 h-3.5" />
                        상태 갱신
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => triggerPatrolMutation.mutate()}
                        disabled={triggerPatrolMutation.isPending}
                        className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                    >
                        <Zap className={`w-3.5 h-3.5 ${triggerPatrolMutation.isPending ? 'animate-spin' : ''}`} />
                        {triggerPatrolMutation.isPending ? '순찰 가동 중...' : '즉시 1회 순찰 가동'}
                    </Button>
                </div>
            </div>

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
                                실시간 스마트폰 푸시
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            파이프라인 제작 완료 알림 및 비상 경보를 모바일 텔레그램으로 즉시 수신합니다.
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
                            <div className="font-bold text-foreground">💡 텔레그램 알림 기능:</div>
                            <div>• 쇼츠 파이프라인 렌더 및 캡컷 내보내기 완료 시 실시간 푸시</div>
                            <div>• 자율 순찰 중 90점 이상 메가 바이럴 영상 포착 시 긴급 보고</div>
                            <div>• API 한도 초과 또는 하드웨어 과열 시 원격 세이프가드 경보</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border bg-card shadow-xs">
                <CardHeader className="border-b border-border/80 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                            <CardTitle className="text-sm font-bold">실시간 자율 순찰 & 관제 이벤트 로그</CardTitle>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                variant={logFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('all')}
                                className="h-7 text-[11px] px-2.5"
                            >
                                전체 로그
                            </Button>
                            <Button
                                size="sm"
                                variant={logFilter === 'success' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('success')}
                                className="h-7 text-[11px] px-2.5"
                            >
                                스킬/성과만
                            </Button>
                            <Button
                                size="sm"
                                variant={logFilter === 'telegram' ? 'default' : 'outline'}
                                onClick={() => setLogFilter('telegram')}
                                className="h-7 text-[11px] px-2.5"
                            >
                                텔레그램 발송
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 font-mono text-xs space-y-2 max-h-64 overflow-y-auto bg-black/20 dark:bg-black/40">
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
