import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Search, 
    Tag, 
    ArrowUpDown, 
    LayoutGrid, 
    Grid2X2, 
    List, 
    Star, 
    MoreHorizontal, 
    Play, 
    Heart, 
    Eye, 
    Bookmark, 
    RefreshCw, 
    Sparkles, 
    Check, 
    ChevronRight,
    SlidersHorizontal,
    Edit3,
    Plus,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { SovereignPreset } from '../presets/PresetLibraryModal';
import { PresetCustomizeModal } from '../presets/PresetCustomizeModal';
import { PresetFolderItem, DEFAULT_PRESET_FOLDERS } from '../presets/SavePresetToFolderModal';

interface PresetLoadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    activePresetId?: string | null;
    onSelectPreset: (preset: SovereignPreset) => void;
}

export const PRESET_FOLDERS = DEFAULT_PRESET_FOLDERS;

type TabType = 'all' | 'personal' | 'pixeling' | 'favorites';
type ViewMode = 'big_card' | 'small_card' | 'list';

export const PresetLoadModal: React.FC<PresetLoadModalProps> = ({
    open,
    onOpenChange,
    activePresetId,
    onSelectPreset,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [selectedFolder, setSelectedFolder] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('small_card');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'views'>('latest');
    const [presets, setPresets] = useState<SovereignPreset[]>([]);
    const [loading, setLoading] = useState(false);
    const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

    // Dynamic Folders State
    const [folders, setFolders] = useState<PresetFolderItem[]>(DEFAULT_PRESET_FOLDERS);
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Inspector modal state
    const [inspectPreset, setInspectPreset] = useState<SovereignPreset | null>(null);
    const [inspectOpen, setInspectOpen] = useState(false);

    const fetchFolders = async () => {
        try {
            const res = await fetch('/api/sovereign-presets/folders');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setFolders(data);
                }
            }
        } catch (e) {
            console.debug('Failed to fetch folders:', e);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            toast.error('보관함 이름을 입력해 주세요.');
            return;
        }

        try {
            const res = await fetch('/api/sovereign-presets/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newFolderName.trim(),
                    icon: '📁',
                    desc: '사용자 추가 커스텀 보관함'
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`[${newFolderName.trim()}] 새 보관함이 생성되었습니다.`);
                setFolders(data.folders || [...folders, data.folder]);
                setSelectedFolder(data.folder?.id || selectedFolder);
                setNewFolderName('');
                setIsAddingFolder(false);
                window.dispatchEvent(new CustomEvent('presets-folders-updated'));
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '보관함 생성 실패');
            }
        } catch {
            toast.error('보관함 생성 통신 오류');
        }
    };

    const fetchPresets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            // Category priority: if a specific folder is selected, use that; otherwise use activeTab
            if (selectedFolder && selectedFolder !== 'all') {
                params.append('category', selectedFolder);
            } else if (activeTab && activeTab !== 'all') {
                params.append('category', activeTab);
            }
            if (searchQuery.trim()) params.append('q', searchQuery.trim());
            if (sortBy) params.append('sort', sortBy);

            const res = await fetch(`/api/sovereign-presets?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setPresets(data);
            }
        } catch (err) {
            console.error('Failed to load presets:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleFoldersUpdated = () => {
            fetchFolders();
        };
        window.addEventListener('presets-folders-updated', handleFoldersUpdated);
        return () => {
            window.removeEventListener('presets-folders-updated', handleFoldersUpdated);
        };
    }, []);

    useEffect(() => {
        if (open) {
            fetchFolders();
            fetchPresets();
        }
    }, [open, activeTab, selectedFolder, sortBy]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            fetchPresets();
        }
    };

    const handleSelect = (preset: SovereignPreset) => {
        onSelectPreset(preset);
        onOpenChange(false);
        toast.success(`[${preset.name}] 프리셋이 적용 대화창에 연결되었습니다.`);
    };

    const tabs: { id: TabType; label: string; desc: string }[] = [
        { id: 'all', label: '전체 프리셋', desc: '모든 보관함의 프리셋을 한눈에 볼 수 있어요.' },
        { id: 'personal', label: '내 커스텀', desc: '발골/저장한 대표님의 맞춤형 제작 기준이에요.' },
        { id: 'pixeling', label: '픽셀링 공식', desc: '픽셀링이 기본으로 제공하는 검증된 제작 기준이에요.' },
        { id: 'favorites', label: '즐겨찾기', desc: '자주 쓰는 프리셋을 모아 볼 수 있어요.' },
    ];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl max-h-[88vh] flex flex-col">
                    {/* Header */}
                    <div className="px-6 pt-5 pb-3 border-b border-border/60">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold text-foreground">
                                    프리셋 불러오기
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-1">
                                    저장 위치별 폴더 또는 대분류 탭을 선택하여 원하는 제작 기준을 즉시 대화창에 연결합니다.
                                </DialogDescription>
                            </div>

                            <button
                                type="button"
                                onClick={fetchPresets}
                                disabled={loading}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors shrink-0"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
                                {loading ? '새로고침 중…' : '새로고침'}
                            </button>
                        </div>

                        {/* High-level Tabs */}
                        <div className="flex items-center gap-1.5 mt-3">
                            <div className="inline-flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setSelectedFolder('all'); // Reset subfolder on high-level tab change
                                        }}
                                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-background text-foreground shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 📁 Folder Category Chips (1:1 synced with SavePresetToFolderModal) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 scrollbar-thin">
                            <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
                                📁 폴더별:
                            </span>

                            {/* 'All' chip */}
                            <button
                                type="button"
                                onClick={() => setSelectedFolder('all')}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                                    selectedFolder === 'all'
                                        ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                                        : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                                }`}
                            >
                                <span>✨</span>
                                <span>전체 폴더</span>
                            </button>

                            {/* Dynamic folder chips */}
                            {folders.map((folder) => {
                                const isSelected = selectedFolder === folder.id;
                                return (
                                    <button
                                        key={folder.id}
                                        type="button"
                                        onClick={() => setSelectedFolder(folder.id)}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                                                : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60'
                                        }`}
                                        title={folder.desc}
                                    >
                                        <span>{folder.icon || '📁'}</span>
                                        <span>{folder.name}</span>
                                    </button>
                                );
                            })}

                            {/* Add Folder Inline Toggle */}
                            {isAddingFolder ? (
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                    <Input
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="새 보관함명..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleCreateFolder();
                                            if (e.key === 'Escape') setIsAddingFolder(false);
                                        }}
                                        className="h-6 w-28 text-[11px] px-2 py-0 bg-background border-primary"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateFolder}
                                        className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 text-xs"
                                        title="생성"
                                    >
                                        <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingFolder(false)}
                                        className="w-6 h-6 rounded bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 text-xs"
                                        title="취소"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingFolder(true)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-lg shrink-0 transition-all flex items-center gap-1 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground border border-dashed border-border/70 cursor-pointer ml-1"
                                    title="새 보관함 추가"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>추가</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter & View mode bar */}
                    <div className="px-6 py-3 bg-muted/30 border-b border-border/40 flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="이름 또는 태그 검색"
                                className="h-8 pl-8 text-xs bg-background border-border/70 rounded-lg"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Sort Selector */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-8 px-2 text-xs bg-background text-foreground border border-border/70 rounded-lg focus:outline-hidden"
                            >
                                <option value="latest">최근 저장순</option>
                                <option value="popular">저장 인기순</option>
                                <option value="views">조회수순</option>
                            </select>

                            {/* View Switcher */}
                            <div className="inline-flex items-center p-0.5 bg-background border border-border/70 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('big_card')}
                                    className={`p-1.5 rounded-md ${viewMode === 'big_card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                    title="큰 카드"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('small_card')}
                                    className={`p-1.5 rounded-md ${viewMode === 'small_card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                    title="작은 카드"
                                >
                                    <Grid2X2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                    title="목록"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Presets Grid/List */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading && presets.length === 0 ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                                <p className="text-xs text-muted-foreground">저장된 프리셋 목록을 불러오는 중입니다…</p>
                            </div>
                        ) : presets.length === 0 ? (
                            <div className="py-20 text-center">
                                <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                                <h4 className="text-sm font-semibold text-foreground">프리셋이 없습니다</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {activeTab === 'favorites' ? '별표를 눌러 자주 쓰는 프리셋을 즐겨찾기에 등록해 보세요.' : '새로운 프리셋을 추가하거나 다른 카테고리를 확인해 보세요.'}
                                </p>
                            </div>
                        ) : (
                            <div className={`grid gap-4 ${
                                viewMode === 'big_card'
                                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                                    : viewMode === 'small_card'
                                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                                    : 'grid-cols-1'
                            }`}>
                                {presets.map((preset) => {
                                    const isHovered = hoveredPresetId === preset.id;
                                    const isSelected = activePresetId === preset.id;

                                    return (
                                        <div
                                            key={preset.id}
                                            onMouseEnter={() => setHoveredPresetId(preset.id)}
                                            onMouseLeave={() => setHoveredPresetId(null)}
                                            onClick={() => handleSelect(preset)}
                                            className={`group relative rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col bg-card hover:shadow-md ${
                                                isSelected
                                                    ? 'border-primary ring-2 ring-primary/20'
                                                    : 'border-border/70 hover:border-border'
                                            }`}
                                        >
                                            {/* Preview Thumbnail / Video Screen */}
                                            <div className="relative aspect-video bg-neutral-900 overflow-hidden flex items-center justify-center">
                                                {isHovered && preset.preview_video_url ? (
                                                    <video
                                                        src={preset.preview_video_url}
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (preset.thumbnail_url || (preset as any).sample_thumbnail) ? (
                                                    <div className="w-full h-full relative overflow-hidden bg-neutral-950 flex items-center justify-center">
                                                        <img
                                                            src={preset.thumbnail_url || (preset as any).sample_thumbnail}
                                                            alt={preset.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors flex items-center justify-center">
                                                            <div className="w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs group-hover:scale-110 transition-transform">
                                                                <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 p-2 text-center select-none">
                                                        {preset.style?.title?.enabled && (
                                                            <div 
                                                                className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-[90%] mb-1"
                                                                style={{
                                                                    backgroundColor: preset.style.title.box_color || '#000',
                                                                    color: preset.style.title.color || '#FFF'
                                                                }}
                                                            >
                                                                {preset.name}
                                                            </div>
                                                        )}
                                                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xs group-hover:scale-110 transition-transform">
                                                            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Top Badge: Folder Category & Version */}
                                                <div className="absolute top-2 left-2 z-10 flex items-center gap-1 flex-wrap max-w-[80%]">
                                                    {preset.category && (
                                                        <Badge variant="secondary" className="text-[9.5px] px-1.5 py-0.5 bg-primary/90 text-primary-foreground border-0 backdrop-blur-xs font-bold shadow-2xs">
                                                            {folders.find(f => f.id === preset.category)?.icon || '📁'} {folders.find(f => f.id === preset.category)?.name.split('/')[0].trim() || preset.category}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-black/60 text-white border-0 backdrop-blur-xs">
                                                        v{preset.version || 1}
                                                    </Badge>
                                                </div>

                                                {/* Top Right Action: Favorite */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toast.success(`${preset.name} 즐겨찾기 상태가 변경되었습니다.`);
                                                    }}
                                                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white/80 hover:text-amber-400 backdrop-blur-xs transition-colors"
                                                >
                                                    <Star className={`w-3.5 h-3.5 ${preset.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                                </button>
                                            </div>

                                            {/* Info Content */}
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                                            {preset.name}
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setInspectPreset(preset);
                                                                setInspectOpen(true);
                                                            }}
                                                            className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                                                            title="프리셋 커스텀 수정"
                                                        >
                                                            <SlidersHorizontal className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {preset.style?.output?.size || '1080 × 1920'} · {preset.style?.output?.fps || '30'}fps
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 leading-relaxed">
                                                        {preset.recipe || '사용자 지정 숏폼 템플릿'}
                                                    </p>
                                                </div>

                                                {/* Metrics */}
                                                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="flex items-center gap-1">
                                                            <Heart className="w-3 h-3 text-rose-500/80" />
                                                            {preset.metrics?.likes || 0}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            {preset.metrics?.views || 0}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Bookmark className="w-3 h-3 text-amber-500/80" />
                                                            {preset.metrics?.saves || 0}
                                                        </span>
                                                    </div>
                                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sub-Inspector for full tuning */}
            {inspectPreset && (
                <PresetCustomizeModal
                    open={inspectOpen}
                    onOpenChange={setInspectOpen}
                    preset={inspectPreset}
                    onPresetUpdated={(updated) => {
                        fetchPresets();
                        setInspectPreset(updated);
                    }}
                />
            )}
        </>
    );
};
