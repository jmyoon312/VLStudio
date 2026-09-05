import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    X, Ban, Search, RefreshCw, ExternalLink, 
    RotateCcw, ShieldAlert, Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn, formatShortDate } from '../../lib/utils';
import { ExcludedChannel, getExcludedChannels, restoreExcludedChannel } from '../../lib/api';

interface ExcludedChannelsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExcludedChannelsModal: React.FC<ExcludedChannelsModalProps> = ({
    isOpen,
    onClose
}) => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [restoringId, setRestoringId] = useState<number | null>(null);

    // 1. Fetch excluded channels
    const { data: excludedList = [], isLoading, refetch } = useQuery<ExcludedChannel[]>({
        queryKey: ['excluded-channels'],
        queryFn: getExcludedChannels,
        enabled: isOpen,
        staleTime: 5000
    });

    // 2. Restore mutation
    const restoreMutation = useMutation({
        mutationFn: async (id: number) => {
            setRestoringId(id);
            return await restoreExcludedChannel(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['excluded-channels'] });
            queryClient.invalidateQueries({ queryKey: ['pending-channels'] });
            queryClient.invalidateQueries({ queryKey: ['channels-with-reels'] });
            setRestoringId(null);
        },
        onError: (err: any) => {
            alert('복원 오류: ' + (err.response?.data?.detail || err.message));
            setRestoringId(null);
        }
    });

    if (!isOpen) return null;

    const filtered = excludedList.filter(item => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.channel_title.toLowerCase().includes(q) ||
            (item.handle && item.handle.toLowerCase().includes(q)) ||
            (item.reason && item.reason.toLowerCase().includes(q))
        );
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-3xl border border-border/90 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/20">
                            <Ban className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-foreground">제외 채널 관리 (블랙리스트)</h2>
                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                    {excludedList.length}개
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                등록된 채널은 트렌드 레이더 추천 및 실시간 스카우터 수집 대상에서 영구 제외됩니다.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-border/60 bg-card flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="제외된 채널명, 핸들 또는 사유 검색..."
                            className="w-full bg-muted/40 border border-border/80 rounded-xl pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="h-9 px-3 text-xs rounded-xl cursor-pointer"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
                        새로고침
                    </Button>
                </div>

                {/* List Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {isLoading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                            <span className="text-xs font-bold">제외 채널 목록 로딩 중...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 rounded-2xl border border-dashed border-border/70 text-center flex flex-col items-center justify-center p-6 text-muted-foreground">
                            <ShieldAlert className="w-10 h-10 mb-2 opacity-30 text-rose-500" />
                            <p className="text-xs font-bold text-foreground/80">
                                {searchQuery ? '검색된 제외 채널이 없습니다.' : '현재 제외(블랙리스트) 등록된 채널이 없습니다.'}
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-sm">
                                추천 목록에서 원치 않는 채널의 [제외] 버튼을 누르면 여기에 등록되어 향후 스카우터 수집에서 차단됩니다.
                            </p>
                        </div>
                    ) : (
                        filtered.map((ch) => (
                            <div
                                key={ch.id}
                                className="p-3.5 rounded-2xl border border-border/80 bg-muted/10 hover:bg-muted/30 transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-xs font-black text-foreground truncate max-w-[240px]">
                                            {ch.channel_title}
                                        </h4>
                                        {ch.handle && (
                                            <span className="text-[10px] font-mono text-muted-foreground/80">
                                                {ch.handle}
                                            </span>
                                        )}
                                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                            {ch.reason || '사용자 제외'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                        <span>등록일: {formatShortDate(ch.created_at)}</span>
                                        {ch.channel_url && (
                                            <a
                                                href={ch.channel_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:text-foreground flex items-center gap-0.5 underline decoration-muted-foreground/40 underline-offset-2"
                                            >
                                                채널 방문 <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => restoreMutation.mutate(ch.id)}
                                    disabled={restoringId === ch.id}
                                    className="h-8 px-3 text-xs font-bold rounded-xl border-border/90 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shrink-0 transition-colors"
                                >
                                    {restoringId === ch.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1 text-emerald-500" />
                                    ) : (
                                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                                    )}
                                    수집 재개 (복원)
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>💡 복원(수집 재개)된 채널은 다음 스카우팅 시 다시 추천 큐에 포함될 수 있습니다.</span>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onClose}
                        className="h-8 px-4 text-xs font-bold rounded-xl cursor-pointer"
                    >
                        닫기
                    </Button>
                </div>
            </div>
        </div>
    );
};
