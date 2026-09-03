import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { CollectionPreset, Category } from '../lib/api';
import { 
    ListVideo, Plus, Sparkles, Folder, ExternalLink, 
    PanelRightClose, PanelRightOpen, CheckCircle, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import ChannelDrawer from './channel/ChannelDrawer';
import PresetBoard from './channel/PresetBoard';
import PresetEditModal from './channel/PresetEditModal';

export const ChannelManager: React.FC = () => {
    const queryClient = useQueryClient();

    // Drawer and Modal States
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
    const [selectedChannelIds, setSelectedChannelIds] = useState<Set<number>>(new Set());
    const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<CollectionPreset | null>(null);
    const [initialPresetChannelIds, setInitialPresetChannelIds] = useState<number[]>([]);

    // Quick Channel Add Input State
    const [quickChannelUrl, setQuickChannelUrl] = useState('');
    const [quickCategoryId, setQuickCategoryId] = useState<number | null>(null);
    const [isAddingChannel, setIsAddingChannel] = useState(false);

    // Categories query for quick channel add
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // Quick Channel Add Mutation
    const addChannelMutation = useMutation({
        mutationFn: ({ url, categoryId }: { url: string, categoryId: number | null }) =>
            api.post('/channels/', { url, category_id: categoryId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setQuickChannelUrl('');
            setIsAddingChannel(false);
            alert('새 타겟 채널이 성공적으로 등록되었습니다!');
        },
        onError: (err: any) => {
            setIsAddingChannel(false);
            alert('채널 추가 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const handleQuickAddChannel = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = quickChannelUrl.trim();
        if (!trimmed) return;
        setIsAddingChannel(true);
        addChannelMutation.mutate({ url: trimmed, categoryId: quickCategoryId });
    };

    // Preset Actions Handlers
    const handleOpenCreatePreset = () => {
        setEditingPreset(null);
        setInitialPresetChannelIds([]);
        setIsPresetModalOpen(true);
    };

    const handleEditPreset = (preset: CollectionPreset) => {
        setEditingPreset(preset);
        setInitialPresetChannelIds(preset.channel_ids || []);
        setIsPresetModalOpen(true);
    };

    const handleCreatePresetWithChannels = (channelIds: number[]) => {
        setEditingPreset(null);
        setInitialPresetChannelIds(channelIds);
        setIsPresetModalOpen(true);
    };

    // Channel Selection Handlers for Drawer
    const handleToggleChannel = (id: number) => {
        setSelectedChannelIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectChannels = (ids: number[]) => {
        setSelectedChannelIds(new Set(ids));
    };

    // Mobile View Tab state ('presets' | 'drawer')
    const [mobileTab, setMobileTab] = useState<'presets' | 'drawer'>('presets');

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden">
            {/* Top Global Bar */}
            <header className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/80 bg-card/60 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 shrink-0">
                {/* Brand & Subtitle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <ListVideo className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                                    타겟 채널 자동 수집
                                </h1>
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">
                                카테고리/채널 그룹핑 및 프리셋 기반 무인 자동 수집
                            </p>
                        </div>
                    </div>

                    {/* [MOBILE ONLY] View Switcher Tab */}
                    <div className="flex md:hidden items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
                        <button
                            onClick={() => setMobileTab('presets')}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                                mobileTab === 'presets' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                            )}
                        >
                            프리셋
                        </button>
                        <button
                            onClick={() => setMobileTab('drawer')}
                            className={cn(
                                "px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer",
                                mobileTab === 'drawer' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground"
                            )}
                        >
                            채널함
                        </button>
                    </div>
                </div>

                {/* Quick Add Channel & Drawer Toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Quick Add Channel Bar */}
                    <form onSubmit={handleQuickAddChannel} className="flex items-center gap-1.5 w-full sm:w-auto">
                        <input
                            type="text"
                            value={quickChannelUrl}
                            onChange={(e) => setQuickChannelUrl(e.target.value)}
                            placeholder="유튜브 채널 URL 또는 @핸들..."
                            className="flex-1 sm:w-56 md:w-64 h-8 px-2.5 text-xs bg-muted/40 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                            disabled={isAddingChannel}
                        />
                        <select
                            value={quickCategoryId || ''}
                            onChange={(e) => setQuickCategoryId(e.target.value ? Number(e.target.value) : null)}
                            className="h-8 px-2 text-xs bg-background border border-input rounded-lg font-semibold cursor-pointer max-w-[100px] sm:max-w-[120px] truncate shrink-0"
                            disabled={isAddingChannel}
                        >
                            <option value="">📁 미분류</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>📁 {cat.name}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            disabled={isAddingChannel || !quickChannelUrl.trim()}
                            className="h-8 px-3 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 flex items-center gap-1 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                            {isAddingChannel ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>등록</span>
                        </button>
                    </form>

                    {/* [DESKTOP ONLY] Drawer Toggle Button */}
                    <button
                        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                        className={cn(
                            "hidden md:flex h-8 px-2.5 rounded-lg border text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shrink-0",
                            isDrawerOpen 
                                ? "bg-primary/10 text-primary border-primary/30" 
                                : "bg-card text-muted-foreground border-border hover:text-foreground"
                        )}
                        title={isDrawerOpen ? "채널 보관함 닫기" : "채널 보관함 열기"}
                    >
                        {isDrawerOpen ? (
                            <>
                                <PanelRightClose className="w-4 h-4" />
                                <span>보관함 숨기기</span>
                            </>
                        ) : (
                            <>
                                <PanelRightOpen className="w-4 h-4" />
                                <span>보관함 열기</span>
                            </>
                        )}
                    </button>
                </div>
            </header>

            {/* Main Content Area: Responsive Switch for Mobile vs Side-by-Side for Desktop */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Preset Management Board */}
                <main className={cn(
                    "flex-1 overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-8 custom-scrollbar",
                    // On mobile, hide if drawer tab is selected
                    mobileTab === 'drawer' ? "hidden md:block" : "block"
                )}>
                    <PresetBoard
                        onOpenCreatePreset={handleOpenCreatePreset}
                        onEditPreset={handleEditPreset}
                    />
                </main>

                {/* Right Side: Channel Drawer */}
                <div className={cn(
                    // Desktop: show if isDrawerOpen
                    // Mobile: show if mobileTab === 'drawer'
                    "md:relative shrink-0",
                    isDrawerOpen ? "md:block" : "md:hidden",
                    mobileTab === 'drawer' ? "block w-full h-full" : "hidden md:block"
                )}>
                    <ChannelDrawer
                        selectedChannelIds={selectedChannelIds}
                        onToggleChannel={handleToggleChannel}
                        onSelectChannels={handleSelectChannels}
                        onCreatePresetWithChannels={handleCreatePresetWithChannels}
                        onClose={() => {
                            setIsDrawerOpen(false);
                            setMobileTab('presets');
                        }}
                    />
                </div>
            </div>

            {/* Create / Edit Preset Modal */}
            <PresetEditModal
                isOpen={isPresetModalOpen}
                onClose={() => setIsPresetModalOpen(false)}
                editingPreset={editingPreset}
                initialChannelIds={initialPresetChannelIds}
            />
        </div>
    );
};

export default ChannelManager;

