import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Channel, Category, Settings } from '../lib/api';
import { Plus, Trash2, RefreshCw, Pause, Play, FolderPlus, X, AlertTriangle, ListVideo } from 'lucide-react';
import { cn, getMediaUrl } from '../lib/utils';

const ChannelManager = () => {
    const queryClient = useQueryClient();
    const [newUrl, setNewUrl] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());
    const [isScriptOnly, setIsScriptOnly] = useState(false); // [NEW]
    const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
    const [editDialog, setEditDialog] = useState<{
        open: boolean;
        channelId: number | null;
        name: string;
        url: string;
        categoryId: number | null;
        originalCategoryId: number | null;
    }>({ open: false, channelId: null, name: '', url: '', categoryId: null, originalCategoryId: null });


    // [NEW] Restore missing queries
    const { data: channels, isLoading } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => { const d = (await api.get<Channel[]>('/channels/')).data; return Array.isArray(d) ? d : []; }
    });

    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => { const d = (await api.get<Category[]>('/categories/')).data; return Array.isArray(d) ? d : []; }
    });

    const { data: settings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => (await api.get<Settings>('/settings/')).data
    });

    // Removed getFileUrl in favor of getMediaUrl utility

    const addCategoryMutation = useMutation({
        mutationFn: (name: string) => api.post('/categories/', { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewCategoryName('');
            setShowCategoryInput(false);
        },
        onError: (error: any) => {
            alert(error.response?.data?.detail || '카테고리 추가에 실패했습니다.');
        }
    });

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
    });

    const addMutation = useMutation({
        mutationFn: (data: { url: string, category_id: number | null }) =>
            api.post('/channels/', {
                url: data.url,
                platform: 'unknown',
                name: 'New Channel',
                folder_name: 'new_channel',
                category_id: data.category_id,
                default_script_only: isScriptOnly // [NEW]
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setNewUrl('');
            setIsScriptOnly(false); // Reset
            setIsAdding(false);
        },
        onError: (error: any) => {
            console.error("Channel Add Error:", error);
            let message = "알 수 없는 오류가 발생했습니다.";

            if (error.response) {
                message = `서버 오류 (${error.response.status}): ${JSON.stringify(error.response.data)}`;
            } else if (error.request) {
                message = "서버 응답이 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.";
            } else {
                message = `요청 설정 오류: ${error.message}`;
            }

            alert(message);
            setIsAdding(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/channels/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
        onError: (error: any) => {
            alert('채널 삭제 실패: ' + (error.response?.data?.detail || error.message || '서버 응답 없음'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => api.patch(`/channels/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setEditDialog(d => ({ ...d, open: false }));
        },
        onError: (error: any) => {
            alert('채널 수정 실패: ' + (error.response?.data?.detail || error.message || '서버 응답 없음'));
        }
    });

    const handleEditOpen = (channel: any) => {
        setEditDialog({
            open: true,
            channelId: channel.id,
            name: channel.name || '',
            url: channel.url || '',
            categoryId: channel.category_id ?? null,
            originalCategoryId: channel.category_id ?? null,
        });
    };

    const handleEditSave = () => {
        if (!editDialog.channelId) return;
        const payload: any = {
            name: editDialog.name,
            url: editDialog.url,
        };
        // Always send category_id (even if null) so backend detects the change
        payload.category_id = editDialog.categoryId;
        updateMutation.mutate({ id: editDialog.channelId, data: payload });
    };



    const scanMutation = useMutation({
        mutationFn: (id: number) => api.post(`/channels/${id}/scan`),
        onSuccess: (res) => {
            const data = res.data;
            if (data.status === 'success') {
                alert(`스캔 완료: ${data.found}개의 신규 영상을 찾았습니다.\n(${data.downloaded}개 다운로드 시작)`);
                queryClient.invalidateQueries({ queryKey: ['channels'] });
            } else {
                alert(`스캔 실패: ${data.error || '알 수 없는 오류'}`);
            }
        },
        onError: (error: any) => {
            alert('요청 중 오류가 발생했습니다: ' + (error.response?.data?.detail || error.message));
        }
    });


    const handleBatchDelete = async () => {
        if (selectedChannels.size === 0) return;
        if (!window.confirm(`선택한 ${selectedChannels.size}개의 채널과 관련된 모든 영상을 삭제하시겠습니까?`)) return;
        
        try {
            await api.post('/channels/batch-delete', { channel_ids: Array.from(selectedChannels) });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setSelectedChannels(new Set());
            // Need toast if possible, otherwise alert is fine. alert is used in this file mostly.
            alert('선택한 채널이 일괄 삭제되었습니다.');
        } catch (error) {
            alert('채널 일괄 삭제 중 오류가 발생했습니다.');
        }
    };

    const toggleChannel = (id: number) => {
        const newSet = new Set(selectedChannels);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedChannels(newSet);
    };

    const toggleAllChannels = () => {
        if (channels && selectedChannels.size === channels.length) {
            setSelectedChannels(new Set());
        } else if (channels) {
            setSelectedChannels(new Set(channels.map(c => c.id)));
        }
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        addCategoryMutation.mutate(newCategoryName);
    };

    const handleDeleteCategory = (id: number, name: string) => {
        if (confirm(`"${name}" 카테고리를 삭제하시겠습니까?\n\n⚠️ 이 카테고리에 속한 모든 채널과 영상이 함께 삭제됩니다.`)) {
            deleteCategoryMutation.mutate(id);
        }
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUrl) return;
        setIsAdding(true);
        addMutation.mutate({ url: newUrl, category_id: selectedCategoryId });
    };

    const getPlatformDisplay = (platform: string) => {
        const lower = platform.toLowerCase().replace('tab', '').trim();
        if (lower === 'youtube') return '유튜브';
        if (lower === 'douyin') return '도우인';
        if (lower === 'tiktok') return '틱톡';
        if (lower === 'instagram') return '인스타그램';
        return platform;
    };

    return (
        <div className="space-y-6 sm:space-y-8 pb-28 sm:pb-8">

            {/* 1. 상단 타이틀 및 설명 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <ListVideo className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        타겟 채널 자동 수집
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        벤치마킹할 글로벌 유튜브/쇼츠 채널을 등록하고 신규 인기 영상을 24시간 자동 감시 및 수집
                    </p>
                </div>
            </div>

            {/* Category Management */}
            <div className="bg-card border border-border rounded-xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">카테고리 관리</span>
                    </div>
                    <button
                        onClick={() => setShowCategoryInput(!showCategoryInput)}
                        className="inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full sm:w-auto"
                    >
                        <FolderPlus className="w-4 h-4 mr-2" />
                        새 카테고리
                    </button>
                </div>

                {showCategoryInput && (
                    <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="카테고리 이름 (예: 영화, 음악)"
                            className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4">
                                추가
                            </button>
                            <button type="button" onClick={() => setShowCategoryInput(false)} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-3">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                )}

                {categories && categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {categories.map((category) => (
                            <div key={category.id} className="inline-flex items-center gap-1 rounded-full border bg-accent px-3 py-1">
                                <span className="text-xs sm:text-sm font-medium">{category.name}</span>
                                <button
                                    onClick={() => handleDeleteCategory(category.id, category.name)}
                                    className="ml-1 rounded-full hover:bg-destructive/10 p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Channel */}
            <div className="bg-card border border-border rounded-xl p-3.5 sm:p-6 space-y-3 sm:space-y-4">
                <form onSubmit={handleAdd} className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">카테고리 (선택사항)</label>
                        <select
                            value={selectedCategoryId || ''}
                            onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value="">카테고리 없음</option>
                            {categories?.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                        <div className="flex-1 space-y-1.5 sm:space-y-2">
                            <label className="text-xs sm:text-sm font-medium">새 채널 URL</label>
                            <input
                                type="text"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                placeholder="https://www.youtube.com/@channel"
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="flex items-center space-x-2 py-1 sm:pb-2">
                            <input
                                id="scriptOnly"
                                type="checkbox"
                                checked={isScriptOnly}
                                onChange={(e) => setIsScriptOnly(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="scriptOnly" className="text-xs sm:text-sm font-medium leading-none cursor-pointer whitespace-nowrap">
                                스크립트 모드 (영상 미다운로드)
                            </label>
                        </div>
                        <button
                            type="submit"
                            disabled={isAdding}
                            className="inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto shrink-0"
                        >
                            {isAdding ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            채널 추가
                        </button>
                    </div>
                </form>
            </div>

            {/* Channel List */}
            <div className="flex justify-end mb-2">
                {selectedChannels.size > 0 && (
                    <button
                        onClick={handleBatchDelete}
                        className="inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 py-2"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        선택 삭제 ({selectedChannels.size})
                    </button>
                )}
            </div>

            {/* Mobile Responsive Channel Card List (sm:hidden) */}
            <div className="sm:hidden space-y-3">
                {isLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border">로딩 중...</div>
                ) : channels?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground bg-card rounded-xl border border-border">등록된 채널이 없습니다.</div>
                ) : (
                    channels?.map((channel) => (
                        <div key={channel.id} className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                            {/* 카드 상단: 체크박스 + 프로필 + 이름 + 상태 */}
                            <div className="flex items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                        checked={selectedChannels.has(channel.id)}
                                        onChange={() => toggleChannel(channel.id)}
                                    />
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden relative">
                                        <span className="absolute inset-0 flex items-center justify-center text-sm">
                                            {channel.name?.[0] || '?'}
                                        </span>
                                        {channel.thumbnail_path && (
                                            <img
                                                src={getMediaUrl(channel.thumbnail_path, settings?.root_download_path)}
                                                alt={channel.name}
                                                className="w-full h-full object-cover relative z-10"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-foreground truncate">{channel.name}</h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[11px] text-muted-foreground font-medium">{getPlatformDisplay(channel.platform)}</span>
                                            {categories?.find(c => c.id === channel.category_id)?.name && (
                                                <span className="inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-semibold border-border bg-secondary text-secondary-foreground">
                                                    {categories.find(c => c.id === channel.category_id)?.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0",
                                    channel.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"
                                )}>
                                    {channel.status === 'active' ? '활성' : '일시정지'}
                                </span>
                            </div>

                            {/* 카드 중단: URL */}
                            <div className="bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground truncate border border-border/50">
                                <a
                                    href={channel.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline hover:text-primary transition-colors truncate block"
                                >
                                    {channel.url}
                                </a>
                            </div>

                            {/* 카드 하단: 토글 스위치 및 액션 버튼들 */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                        <button
                                            type="button"
                                            onClick={() => updateMutation.mutate({ id: channel.id, data: { auto_download: !channel.auto_download } })}
                                            className={cn(
                                                "w-8 h-5 rounded-full transition-colors relative",
                                                channel.auto_download ? "bg-primary" : "bg-input"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                                channel.auto_download ? "translate-x-3" : "translate-x-0"
                                            )} />
                                        </button>
                                        <span className="text-[11px]">자동다운</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                        <button
                                            type="button"
                                            onClick={() => updateMutation.mutate({ id: channel.id, data: { default_script_only: !channel.default_script_only } })}
                                            className={cn(
                                                "w-8 h-5 rounded-full transition-colors relative",
                                                channel.default_script_only ? "bg-primary" : "bg-input"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                                                channel.default_script_only ? "translate-x-3" : "translate-x-0"
                                            )} />
                                        </button>
                                        <span className="text-[11px]">스크립트</span>
                                    </label>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => scanMutation.mutate(channel.id)}
                                        disabled={scanMutation.isPending}
                                        title="즉시 스캔"
                                        className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent h-8 w-8 shrink-0"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", scanMutation.isPending && "animate-spin")} />
                                    </button>
                                    <button
                                        onClick={() => updateMutation.mutate({ id: channel.id, data: { status: channel.status === 'active' ? 'paused' : 'active' } })}
                                        className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-accent h-8 w-8 shrink-0"
                                    >
                                        {channel.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('정말 삭제하시겠습니까?')) deleteMutation.mutate(channel.id); }}
                                        disabled={deleteMutation.isPending}
                                        className="inline-flex items-center justify-center rounded-lg text-xs font-medium border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-8 w-8 shrink-0"
                                    >
                                        <Trash2 className={cn("w-3.5 h-3.5 text-red-500", deleteMutation.isPending && "animate-pulse")} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="relative w-full overflow-x-auto">
                    <table className="w-full min-w-[700px] caption-bottom text-xs sm:text-sm">
                        <thead className="[&_tr]:border-b bg-muted/40">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground w-10 sm:w-12">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-border text-primary focus:ring-primary"
                                        checked={channels?.length > 0 && selectedChannels.size === channels?.length}
                                        onChange={toggleAllChannels}
                                    />
                                </th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px] whitespace-nowrap">카테고리</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">플랫폼</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[140px] whitespace-nowrap">이름</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[160px] whitespace-nowrap">URL</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">상태</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">자동 다운로드</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">스크립트 모드</th>
                                <th className="h-10 sm:h-12 px-3 sm:px-4 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">작업</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {isLoading ? (
                                <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">로딩 중...</td></tr>
                            ) : channels?.map((channel) => (
                                <tr key={channel.id} className="border-b transition-colors hover:bg-muted/30">
                                    <td className="p-3 sm:p-4 align-middle">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-border text-primary focus:ring-primary"
                                            checked={selectedChannels.has(channel.id)}
                                            onChange={() => toggleChannel(channel.id)}
                                        />
                                    </td>
                                    <td className="p-3 sm:p-4 align-middle whitespace-nowrap">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors border-border bg-secondary text-secondary-foreground text-xs",
                                            (categories?.find(c => c.id === channel.category_id)?.name.length || 0) > 8 ? "text-[10px]" : "text-xs"
                                        )}>
                                            {categories?.find(c => c.id === channel.category_id)?.name || '없음'}
                                        </span>
                                    </td>
                                    <td className="p-3 sm:p-4 align-middle font-medium whitespace-nowrap">{getPlatformDisplay(channel.platform)}</td>
                                    <td className="p-3 sm:p-4 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2.5 sm:gap-3">
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0 overflow-hidden relative">
                                                <span className="absolute inset-0 flex items-center justify-center">
                                                    {channel.name[0]}
                                                </span>
                                                {channel.thumbnail_path && (
                                                    <img
                                                        src={getMediaUrl(channel.thumbnail_path, settings?.root_download_path)}
                                                        alt={channel.name}
                                                        className="w-full h-full object-cover relative z-10"
                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                )}
                                            </div>
                                            <span className="font-bold text-foreground">{channel.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 sm:p-4 align-middle text-muted-foreground truncate max-w-[150px] whitespace-nowrap">
                                        <a
                                            href={channel.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline hover:text-primary transition-colors"
                                        >
                                            {channel.url}
                                        </a>
                                    </td>

                                    <td className="p-4 align-middle">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                            channel.status === 'active' ? "border-transparent bg-emerald-500/10 text-emerald-500" : "border-transparent bg-muted text-muted-foreground"
                                        )}>
                                            {channel.status === 'active' ? '활성' : '일시정지'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <button
                                            onClick={() => updateMutation.mutate({ id: channel.id, data: { auto_download: !channel.auto_download } })}
                                            className={cn(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                channel.auto_download ? "bg-primary" : "bg-input"
                                            )}
                                        >
                                            <span className={cn(
                                                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                channel.auto_download ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </button>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <button
                                            onClick={() => updateMutation.mutate({ id: channel.id, data: { default_script_only: !channel.default_script_only } })}
                                            className={cn(
                                                "w-10 h-6 rounded-full transition-colors relative",
                                                channel.default_script_only ? "bg-primary" : "bg-input"
                                            )}
                                            title="스크립트 전용 모드 (영상 다운로드 건너뛰기)"
                                        >
                                            <span className={cn(
                                                "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                                                channel.default_script_only ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </button>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                            <button
                                                onClick={() => handleEditOpen(channel)}
                                                title="채널 정보 수정"
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 shrink-0"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                            </button>

                                            <button
                                                onClick={() => scanMutation.mutate(channel.id)}
                                                disabled={scanMutation.isPending}
                                                title="즉시 스캔"
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 shrink-0"
                                            >
                                                <RefreshCw className={cn("w-4 h-4", scanMutation.isPending && "animate-spin")} />
                                            </button>
                                            <button
                                                onClick={() => updateMutation.mutate({ id: channel.id, data: { status: channel.status === 'active' ? 'paused' : 'active' } })}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 shrink-0"
                                            >
                                                {channel.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('정말 삭제하시겠습니까?')) deleteMutation.mutate(channel.id); }}
                                                disabled={deleteMutation.isPending}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-destructive hover:text-destructive-foreground h-9 w-9 shrink-0"
                                            >
                                                <Trash2 className={cn("w-4 h-4", deleteMutation.isPending && "animate-pulse")} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== Channel Edit Dialog ===== */}
            {editDialog.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-foreground">채널 정보 수정</h2>
                            <button
                                onClick={() => setEditDialog(d => ({ ...d, open: false }))}
                                className="rounded-full p-1.5 hover:bg-muted transition-colors"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">채널 이름</label>
                            <input
                                type="text"
                                value={editDialog.name}
                                onChange={e => setEditDialog(d => ({ ...d, name: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="채널 이름"
                            />
                        </div>

                        {/* URL */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">채널 URL</label>
                            <input
                                type="text"
                                value={editDialog.url}
                                onChange={e => setEditDialog(d => ({ ...d, url: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                                placeholder="https://www.youtube.com/@channel"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">카테고리</label>
                            <select
                                value={editDialog.categoryId ?? ''}
                                onChange={e => setEditDialog(d => ({ ...d, categoryId: e.target.value ? Number(e.target.value) : null }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">카테고리 없음 (미분류)</option>
                                {categories?.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Category change warning */}
                        {editDialog.categoryId !== editDialog.originalCategoryId && (
                            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                    카테고리를 변경하면 이미 다운로드된 영상 폴더가 새 카테고리 폴더로 자동 이동됩니다.
                                    {editDialog.categoryId === null && (
                                        <span className="block mt-1 font-medium">미분류로 변경 시: <code className="text-xs bg-amber-500/20 px-1 rounded">07_Downloads/_temp_storage/</code> 폴더로 이동됩니다.</span>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => setEditDialog(d => ({ ...d, open: false }))}
                                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={updateMutation.isPending}
                                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-semibold"
                            >
                                {updateMutation.isPending ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelManager;