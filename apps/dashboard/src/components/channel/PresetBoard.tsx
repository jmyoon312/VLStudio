import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { CollectionPreset, Channel, Category } from '../../lib/api';
import { 
    Sparkles, Play, Trash2, Settings, Plus, LayoutGrid, Table, 
    Check, X, Clock, Video, FileText, TrendingUp, Filter, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PresetBoardProps {
    onOpenCreatePreset: () => void;
    onEditPreset: (preset: CollectionPreset) => void;
}

export const PresetBoard: React.FC<PresetBoardProps> = ({
    onOpenCreatePreset,
    onEditPreset,
}) => {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [runningPresetId, setRunningPresetId] = useState<number | null>(null);

    // Queries
    const { data: presets = [], isLoading: isPresetsLoading } = useQuery({
        queryKey: ['collection_presets'],
        queryFn: async () => (await api.get<CollectionPreset[]>('/presets/')).data || []
    });

    const { data: channels = [] } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => (await api.get<Channel[]>('/channels/')).data || []
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // Mutations
    const toggleActiveMutation = useMutation({
        mutationFn: (id: number) => api.put(`/presets/${id}/toggle-active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
        }
    });

    const deletePresetMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/presets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
        }
    });

    const updatePresetMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: Partial<CollectionPreset> }) =>
            api.put(`/presets/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
        }
    });

    const removeChannelFromPreset = (preset: CollectionPreset, channelIdToRemove: number) => {
        const nextIds = (preset.channel_ids || []).filter(id => id !== channelIdToRemove);
        api.put(`/presets/${preset.id}/channels`, nextIds).then(() => {
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
        });
    };

    const handleRunPreset = async (preset: CollectionPreset) => {
        setRunningPresetId(preset.id);
        try {
            await api.post(`/presets/${preset.id}/run`);
            alert(`'${preset.name}' 수집 작업이 백그라운드에서 시작되었습니다!`);
            queryClient.invalidateQueries({ queryKey: ['collection_presets'] });
        } catch (e: any) {
            alert('수집 실행 실패: ' + (e.response?.data?.detail || e.message));
        } finally {
            setRunningPresetId(null);
        }
    };

    return (
        <div className="space-y-4 select-none">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 border border-border p-3.5 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-extrabold tracking-tight">수집 조건 프리셋 관리 보드</h2>
                        <p className="text-xs text-muted-foreground">카테고리/채널별 수집 조건 및 무인 자동화 룰 제어</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                                viewMode === 'grid' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="카드 그리드 뷰"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">카드</span>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer",
                                viewMode === 'table' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="테이블 뷰"
                        >
                            <Table className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">테이블</span>
                        </button>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={onOpenCreatePreset}
                        className="px-3.5 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 flex items-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        새 프리셋 생성
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {isPresetsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">프리셋 불러오는 중...</span>
                </div>
            ) : presets.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center bg-card/30 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h3 className="text-sm font-bold text-foreground">등록된 수집 프리셋이 없습니다.</h3>
                        <p className="text-xs text-muted-foreground">
                            원하는 채널과 수집 조건(최소 조회수, 기간, 숏폼/롱폼 등)을 묶어 프리셋을 만들어 보세요.
                        </p>
                    </div>
                    <button
                        onClick={onOpenCreatePreset}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        첫 프리셋 생성하기
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                /* Card Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {presets.map((preset) => {
                        const boundChannels = channels.filter(c => (preset.channel_ids || []).includes(c.id));
                        const boundFolders = categories.filter(c => (preset.folder_ids || []).includes(c.id));
                        const isRunning = runningPresetId === preset.id;

                        return (
                            <div
                                key={preset.id}
                                className={cn(
                                    "bg-card/90 border rounded-2xl p-4 space-y-3.5 shadow-sm transition-all duration-200 hover:shadow-md",
                                    preset.is_auto_active ? "border-border" : "border-border/60 opacity-80"
                                )}
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-sm truncate text-foreground" title={preset.name}>
                                                {preset.name}
                                            </h3>
                                            <span className={cn(
                                                "text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 uppercase",
                                                preset.video_type === 'shorts' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" :
                                                preset.video_type === 'long' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                                                "bg-muted text-muted-foreground"
                                            )}>
                                                {preset.video_type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                {preset.last_run_at 
                                                    ? `${new Date(preset.last_run_at).toLocaleDateString()} ${new Date(preset.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                                    : '실행 이력 없음'}
                                            </span>
                                            {preset.last_collected_count > 0 && (
                                                <span className="text-primary font-bold">
                                                    (+{preset.last_collected_count}개 수집됨)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Active Toggle & Settings */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                            onClick={() => toggleActiveMutation.mutate(preset.id)}
                                            className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 border transition-all cursor-pointer",
                                                preset.is_auto_active 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                    : "bg-muted text-muted-foreground border-border"
                                            )}
                                            title="무인 자동 수집 ON/OFF"
                                        >
                                            <span className={cn("w-1.5 h-1.5 rounded-full", preset.is_auto_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                                            {preset.is_auto_active ? '24H 자동' : '일시정지'}
                                        </button>
                                        <button
                                            onClick={() => onEditPreset(preset)}
                                            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                            title="프리셋 설정 수정"
                                        >
                                            <Settings className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`'${preset.name}' 프리셋을 삭제하시겠습니까?`)) {
                                                    deletePresetMutation.mutate(preset.id);
                                                }
                                            }}
                                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                            title="프리셋 삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Mini Visual Progress Gauge Bar */}
                                {(() => {
                                    const totalTarget = Math.max(1, (boundChannels.length + boundFolders.length) * (preset.max_videos_per_channel || 1));
                                    const currentCollected = preset.today_collected_count ?? preset.last_collected_count ?? 0;
                                    const progressPercent = Math.min(100, Math.round((currentCollected / totalTarget) * 100));

                                    return (
                                        <div className="bg-muted/30 p-2.5 rounded-xl border border-border/60 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    <span className="text-muted-foreground text-[10px]">오늘 수집 달성률</span>
                                                    <span className={cn(
                                                        "text-xs font-extrabold",
                                                        progressPercent >= 100 ? "text-emerald-500" : "text-primary"
                                                    )}>
                                                        {progressPercent}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px]">
                                                    <span className="text-muted-foreground font-medium">
                                                        오늘 {currentCollected}/{totalTarget}개 완료
                                                    </span>
                                                    {preset.collect_video && (
                                                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-500 font-bold border border-indigo-500/20">
                                                            영상
                                                        </span>
                                                    )}
                                                    {preset.collect_script && (
                                                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                                                            대본
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Micro Progress Bar */}
                                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        isRunning ? "bg-primary animate-pulse" :
                                                        progressPercent >= 100 ? "bg-emerald-500" :
                                                        progressPercent > 0 ? "bg-primary" : "bg-muted-foreground/30"
                                                    )}
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Bound Channels & Folders Chips */}
                                <div className="space-y-1 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
                                        <span>대상 채널 / 폴더 ({boundChannels.length + boundFolders.length}개)</span>
                                        <button 
                                            onClick={() => onEditPreset(preset)}
                                            className="text-primary hover:underline text-[10px] cursor-pointer"
                                        >
                                            채널 관리
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar pt-0.5">
                                        {boundFolders.map(folder => (
                                            <span
                                                key={`f-${folder.id}`}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                                            >
                                                📁 {folder.name} (폴더)
                                            </span>
                                        ))}
                                        {boundChannels.map(ch => (
                                            <span
                                                key={`c-${ch.id}`}
                                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-background border border-border text-foreground group"
                                            >
                                                <span className="truncate max-w-[100px]">{ch.name}</span>
                                                <button
                                                    onClick={() => removeChannelFromPreset(preset, ch.id)}
                                                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                                                    title="채널 제외"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </span>
                                        ))}
                                        {boundChannels.length === 0 && boundFolders.length === 0 && (
                                            <span className="text-[11px] text-muted-foreground italic">
                                                연결된 채널이 없습니다. 보관함에서 채널을 추가해 주세요.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Condition Badges Matrix (Inline Dropdown Selectors) */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    {/* Upload Period */}
                                    <div className="p-2 rounded-lg bg-background border border-border/80">
                                        <span className="text-[10px] text-muted-foreground block font-medium">업로드 기간</span>
                                        <select
                                            value={preset.upload_period}
                                            onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { upload_period: e.target.value as any } })}
                                            className="w-full bg-transparent font-bold text-foreground text-xs mt-0.5 focus:outline-none cursor-pointer"
                                        >
                                            <option value="1d">최근 1일</option>
                                            <option value="3d">최근 3일</option>
                                            <option value="7d">최근 7일</option>
                                            <option value="30d">최근 30일</option>
                                            <option value="all">전체 기간</option>
                                        </select>
                                    </div>

                                    {/* Min Views */}
                                    <div className="p-2 rounded-lg bg-background border border-border/80">
                                        <span className="text-[10px] text-muted-foreground block font-medium">최소 조회수</span>
                                        <select
                                            value={preset.min_views}
                                            onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { min_views: Number(e.target.value) } })}
                                            className="w-full bg-transparent font-bold text-foreground text-xs mt-0.5 focus:outline-none cursor-pointer"
                                        >
                                            <option value={10000}>1만+</option>
                                            <option value={50000}>5만+</option>
                                            <option value={100000}>10만+</option>
                                            <option value={300000}>30만+</option>
                                            <option value={500000}>50만+</option>
                                            <option value={1000000}>100만+</option>
                                        </select>
                                    </div>

                                    {/* Sort By */}
                                    <div className="p-2 rounded-lg bg-background border border-border/80">
                                        <span className="text-[10px] text-muted-foreground block font-medium">정렬 기준</span>
                                        <select
                                            value={preset.sort_by}
                                            onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { sort_by: e.target.value as any } })}
                                            className="w-full bg-transparent font-bold text-foreground text-xs mt-0.5 focus:outline-none cursor-pointer"
                                        >
                                            <option value="popular">인기순 (조회수)</option>
                                            <option value="latest">최신순 (업로드)</option>
                                        </select>
                                    </div>

                                    {/* Max Per Channel */}
                                    <div className="p-2 rounded-lg bg-background border border-border/80">
                                        <span className="text-[10px] text-muted-foreground block font-medium">채널당 개수</span>
                                        <select
                                            value={preset.max_videos_per_channel}
                                            onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { max_videos_per_channel: Number(e.target.value) } })}
                                            className="w-full bg-transparent font-bold text-foreground text-xs mt-0.5 focus:outline-none cursor-pointer"
                                        >
                                            <option value={1}>1개</option>
                                            <option value={2}>2개</option>
                                            <option value={3}>3개</option>
                                            <option value={5}>5개</option>
                                            <option value={10}>10개</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Collection Mode Branching (Video / Script) */}
                                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={preset.collect_video}
                                                onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { collect_video: e.target.checked } })}
                                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <span className="flex items-center gap-1">
                                                <Video className="w-3.5 h-3.5 text-indigo-500" />
                                                영상(MP4)
                                            </span>
                                        </label>

                                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={preset.collect_script}
                                                onChange={(e) => updatePresetMutation.mutate({ id: preset.id, data: { collect_script: e.target.checked } })}
                                                className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                                대본(SRT)
                                            </span>
                                        </label>
                                    </div>

                                    {/* Run Now Trigger Button */}
                                    <button
                                        onClick={() => handleRunPreset(preset)}
                                        disabled={isRunning}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer",
                                            isRunning 
                                                ? "bg-muted text-muted-foreground" 
                                                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                                        )}
                                    >
                                        <Play className={cn("w-3 h-3", isRunning && "animate-spin")} />
                                        {isRunning ? '수집 중...' : '지금 수집 실행'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Compact Table View */
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                                    <th className="py-2.5 px-3">상태</th>
                                    <th className="py-2.5 px-3">프리셋 이름</th>
                                    <th className="py-2.5 px-3">타입</th>
                                    <th className="py-2.5 px-3">수집 대상 (채널)</th>
                                    <th className="py-2.5 px-3">조건 요약</th>
                                    <th className="py-2.5 px-3">수집 항목</th>
                                    <th className="py-2.5 px-3">수집 달성률</th>
                                    <th className="py-2.5 px-3">최근 실행</th>
                                    <th className="py-2.5 px-3 text-right">액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {presets.map((preset) => {
                                    const boundCount = (preset.channel_ids || []).length + (preset.folder_ids || []).length;
                                    const totalTarget = Math.max(1, boundCount * (preset.max_videos_per_channel || 1));
                                    const currentCollected = preset.today_collected_count ?? preset.last_collected_count ?? 0;
                                    const progressPercent = Math.min(100, Math.round((currentCollected / totalTarget) * 100));

                                    return (
                                        <tr key={preset.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-2.5 px-3">
                                                <button
                                                    onClick={() => toggleActiveMutation.mutate(preset.id)}
                                                    className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer",
                                                        preset.is_auto_active 
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                                            : "bg-muted text-muted-foreground border-border"
                                                    )}
                                                >
                                                    {preset.is_auto_active ? 'ON' : 'OFF'}
                                                </button>
                                            </td>
                                            <td className="py-2.5 px-3 font-bold text-foreground">
                                                {preset.name}
                                            </td>
                                            <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-muted-foreground">
                                                {preset.video_type}
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground">
                                                {boundCount}개 채널/폴더
                                            </td>
                                            <td className="py-2.5 px-3 font-medium">
                                                {preset.upload_period} / {(preset.min_views / 10000).toFixed(0)}만+ / {preset.sort_by === 'popular' ? '인기순' : '최신순'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                    {preset.collect_video && <span className="text-indigo-600 dark:text-indigo-400">영상</span>}
                                                    {preset.collect_video && preset.collect_script && <span>+</span>}
                                                    {preset.collect_script && <span className="text-emerald-600 dark:text-emerald-400">대본</span>}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="w-28 space-y-1">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="font-bold text-primary">{progressPercent}%</span>
                                                        <span className="text-muted-foreground">{currentCollected}/{totalTarget}</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                progressPercent >= 100 ? "bg-emerald-500" : "bg-primary"
                                                            )}
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                                                {preset.last_run_at ? new Date(preset.last_run_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleRunPreset(preset)}
                                                        className="p-1 rounded text-primary hover:bg-primary/10 cursor-pointer"
                                                        title="즉시 실행"
                                                    >
                                                        <Play className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onEditPreset(preset)}
                                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                                        title="수정"
                                                    >
                                                        <Settings className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`'${preset.name}' 프리셋을 삭제하시겠습니까?`)) {
                                                                deletePresetMutation.mutate(preset.id);
                                                            }
                                                        }}
                                                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
export default PresetBoard;

