import React, { useState } from 'react';
import { 
    Calendar, 
    Clock, 
    Play, 
    Pause, 
    Plus, 
    Sparkles, 
    Share2, 
    Layers, 
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleJobItem {
    id: string;
    title: string;
    targetChannel: string;
    formFactor: string;
    scheduleTime: string;
    recurrence: string;
    status: 'scheduled' | 'running' | 'paused';
}

const SAMPLE_SCHEDULES: ScheduleJobItem[] = [
    {
        id: 'sch-1',
        title: '매일 퇴근길 사이다 썰 쇼츠 1편 자동 제작',
        targetChannel: '초단기 사이다 썰방',
        formFactor: '4. 썰형 쇼츠',
        scheduleTime: '매일 17:30',
        recurrence: '매일 1회',
        status: 'scheduled'
    },
    {
        id: 'sch-2',
        title: '매주 월/목 글로벌 시사 이슈 60초 브리핑',
        targetChannel: '글로벌 이슈 나침반',
        formFactor: '1. 클래식 쇼츠',
        scheduleTime: '월, 목 08:00',
        recurrence: '주 2회',
        status: 'scheduled'
    },
    {
        id: 'sch-3',
        title: '주말 힐링 감성 릴스 자동 발행',
        targetChannel: '인스타 감성 힐링 릴스',
        formFactor: '2. 인스타 릴스',
        scheduleTime: '토요일 11:00',
        recurrence: '주 1회',
        status: 'paused'
    }
];

export function PixelingSchedulesView() {
    const [scheduleType, setScheduleType] = useState<'video' | 'card_news'>('video');
    const [schedules, setSchedules] = useState<ScheduleJobItem[]>(SAMPLE_SCHEDULES);

    const toggleStatus = (id: string) => {
        setSchedules(prev => prev.map(s => {
            if (s.id === id) {
                const nextStatus = s.status === 'scheduled' ? 'paused' : 'scheduled';
                toast.success(`[${s.title}] 예약을 ${nextStatus === 'scheduled' ? '재개' : '일시정지'}했습니다.`);
                return { ...s, status: nextStatus };
            }
            return s;
        }));
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6">
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <h2 className="text-base font-bold text-foreground">자동 제작 예약 스케줄러</h2>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            정해 둔 시간에 영상이나 카드뉴스 제작을 자동으로 시작하고 파이프라인 대기열에 등록합니다.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => toast.info('새 예약 등록 다이얼로그를 엽니다.')}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>새 자동 예약 등록</span>
                        </button>
                    </div>
                </div>

                {/* Sub Tabs: Video vs Card News */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setScheduleType('video')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            scheduleType === 'video'
                                ? 'bg-foreground text-background font-bold'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        쇼츠 비디오 예약 (3)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setScheduleType('card_news');
                            toast.info('카드뉴스 예약은 ChatGPT 연결 모드와 연동됩니다.');
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                            scheduleType === 'card_news'
                                ? 'bg-foreground text-background font-bold'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        카드뉴스 예약 (0)
                    </button>
                </div>

                {/* Schedules List */}
                <div className="grid grid-cols-1 gap-3">
                    {schedules.map(sch => (
                        <div
                            key={sch.id}
                            className="p-4 rounded-xl border border-border/80 bg-card hover:border-blue-600/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        sch.status === 'scheduled'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {sch.status === 'scheduled' ? '예약 가동 중' : '일시정지됨'}
                                    </span>
                                    <span className="text-xs font-bold text-foreground">{sch.title}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                    <span>대상 채널: <strong className="text-foreground">{sch.targetChannel}</strong></span>
                                    <span>·</span>
                                    <span>폼팩터: {sch.formFactor}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1 font-mono">
                                        <Clock className="w-3 h-3" />
                                        {sch.scheduleTime} ({sch.recurrence})
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => toggleStatus(sch.id)}
                                    className="px-3 py-1.5 rounded-lg border border-border/70 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                    {sch.status === 'scheduled' ? (
                                        <>
                                            <Pause className="w-3.5 h-3.5 text-amber-500" />
                                            <span>일시정지</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>예약 재개</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
