import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

export interface ChatScheduleConfig {
    enabled: boolean;
    durationDays: number;
    dailyVideoCount: number;
    dailyStartTime: string; // "09:00"
    startDate: string; // ISO string
    endDate: string; // ISO string
    totalCount: number;
}

interface ChatScheduleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentConfig?: ChatScheduleConfig | null;
    onSaveConfig: (config: ChatScheduleConfig | null) => void;
}

export const ChatScheduleModal: React.FC<ChatScheduleModalProps> = ({
    open,
    onOpenChange,
    currentConfig,
    onSaveConfig,
}) => {
    const [durationPreset, setDurationPreset] = useState<'1' | '7' | '30' | 'custom'>(
        currentConfig ? (currentConfig.durationDays === 1 ? '1' : currentConfig.durationDays === 7 ? '7' : currentConfig.durationDays === 30 ? '30' : 'custom') : '7'
    );
    const [durationDays, setDurationDays] = useState<number>(currentConfig?.durationDays ?? 7);
    const [dailyVideoCount, setDailyVideoCount] = useState<number>(currentConfig?.dailyVideoCount ?? 3);
    const [dailyStartTime, setDailyStartTime] = useState<string>(currentConfig?.dailyStartTime ?? '09:00');

    // Dates calculation
    const now = useMemo(() => new Date(), []);
    
    const calculatedEndDate = useMemo(() => {
        const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
        return end;
    }, [now, durationDays]);

    const totalCount = useMemo(() => {
        return Math.max(1, durationDays) * Math.max(1, dailyVideoCount);
    }, [durationDays, dailyVideoCount]);

    const formatFullDate = (d: Date) => {
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    };

    const formatShortDateTime = (d: Date, timeStr: string) => {
        return `${d.getMonth() + 1}월 ${d.getDate()}일 ${timeStr}`;
    };

    const handleSelectPreset = (preset: '1' | '7' | '30' | 'custom') => {
        setDurationPreset(preset);
        if (preset === '1') setDurationDays(1);
        else if (preset === '7') setDurationDays(7);
        else if (preset === '30') setDurationDays(30);
    };

    const handleDaysChange = (val: number) => {
        const safeVal = Math.max(1, Math.min(365, val || 1));
        setDurationDays(safeVal);
        if (safeVal === 1) setDurationPreset('1');
        else if (safeVal === 7) setDurationPreset('7');
        else if (safeVal === 30) setDurationPreset('30');
        else setDurationPreset('custom');
    };

    const handleSave = () => {
        const config: ChatScheduleConfig = {
            enabled: true,
            durationDays,
            dailyVideoCount,
            dailyStartTime,
            startDate: now.toISOString(),
            endDate: calculatedEndDate.toISOString(),
            totalCount,
        };
        onSaveConfig(config);
        toast.success(`채팅방 예약이 완료되었습니다. (총 ${totalCount}개 제작 예정)`);
        onOpenChange(false);
    };

    const handleCancelSchedule = () => {
        onSaveConfig(null);
        toast.info('채팅방 예약이 해제되었습니다.');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[460px] p-6 rounded-3xl bg-background border border-border shadow-2xl">
                <DialogHeader className="space-y-1.5 pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold text-foreground">
                            이 채팅방 예약
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground font-normal">
                        이 채팅의 제작 기준으로 매일 새로운 영상을 만들어요.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 pt-1">
                    {/* 기간 선택 칩 */}
                    <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-foreground">
                            얼마 동안 만들까요?
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { id: '1', label: '1일' },
                                { id: '7', label: '일주일 (7일)' },
                                { id: '30', label: '한 달 (30일)' },
                                { id: 'custom', label: '직접 입력' },
                            ].map((tab) => {
                                const isSelected = durationPreset === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => handleSelectPreset(tab.id as any)}
                                        className={`h-9 px-2 text-xs rounded-full font-medium transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-muted text-foreground font-bold shadow-xs border border-border/80'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 전체 예약 기간 & 마지막 날 */}
                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                전체 예약 기간 (일)
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={durationDays}
                                onChange={(e) => handleDaysChange(parseInt(e.target.value, 10))}
                                className="h-10 rounded-xl bg-card border-border/80 text-sm font-semibold"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">
                                마지막 날
                            </label>
                            <div className="h-10 px-3 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between text-xs text-foreground font-medium select-none">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span>{formatFullDate(calculatedEndDate)}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 하루 영상 개수 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            하루 영상 개수
                        </label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={dailyVideoCount}
                            onChange={(e) => setDailyVideoCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="h-10 rounded-xl bg-card border-border/80 text-sm font-semibold"
                        />
                    </div>

                    {/* 매일 시작 시간 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                            매일 시작 시간
                        </label>
                        <div className="relative">
                            <Input
                                type="time"
                                value={dailyStartTime}
                                onChange={(e) => setDailyStartTime(e.target.value)}
                                className="h-10 rounded-xl bg-card border-border/80 text-sm font-semibold pr-9"
                            />
                            <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-3 pointer-events-none" />
                        </div>
                    </div>

                    {/* 계산 요약 카드 */}
                    <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-1 select-none">
                        <div className="text-xs font-medium text-foreground">
                            {formatShortDateTime(now, dailyStartTime)}부터
                        </div>
                        <div className="text-xs font-bold text-foreground">
                            {formatShortDateTime(calculatedEndDate, dailyStartTime)}까지 · 총 {totalCount}개 예정
                        </div>
                    </div>

                    {/* 안내 문구 */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        서울 시간 기준 · PC와 ViraLoop를 켜 두세요. 꺼져 있던 시간은 건너뛰어요. 계정 사용량과 연결된 API 비용이 발생할 수 있어요. 추가 사용량 제한 없이 설정한 개수까지 제작해요.
                    </p>
                </div>

                {/* 버튼 영역 */}
                <div className="flex items-center justify-end gap-2.5 pt-4">
                    {currentConfig?.enabled && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCancelSchedule}
                            className="h-9 px-4 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer mr-auto"
                        >
                            예약 해제
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="h-9 px-4 rounded-xl text-xs font-medium border-border/80 hover:bg-muted text-foreground cursor-pointer"
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="h-9 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                    >
                        {currentConfig?.enabled ? '예약 수정' : '예약하기'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
