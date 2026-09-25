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
    X,
    ExternalLink,
    Trash2
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
    const [liveHeadline, setLiveHeadline] = useState('');
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

    const handleDeletePreset = async (preset: SovereignPreset, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = window.confirm(`'${preset.name}' 프리셋을 완전히 삭제하시겠습니까?\n\n※ 연관된 썸네일, 비디오 샘플 및 데이터베이스 정보가 모두 영구 삭제되어 정리됩니다.`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/sovereign-presets/${preset.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success(`[${preset.name}] 프리셋 및 관련 파일이 모두 깔끔하게 삭제되었습니다.`);
                fetchPresets();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || '프리셋 삭제에 실패했습니다.');
            }
        } catch {
            toast.error('프리셋 삭제 통신 오류');
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
                <DialogContent className="max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
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
                    <div className="px-6 py-2.5 bg-muted/30 border-b border-border/40 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder="프리셋 이름 또는 태그 검색..."
                                    className="h-8 pl-8 text-xs bg-background border-border/70 rounded-lg"
                                />
                            </div>

                            {/* Live Headline Preview Input */}
                            <div className="relative flex-1 max-w-sm hidden sm:block">
                                <Sparkles className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500" />
                                <Input
                                    value={liveHeadline}
                                    onChange={(e) => setLiveHeadline(e.target.value)}
                                    placeholder="문장 미리보기 (내 대본 첫줄)..."
                                    className="h-8 pl-8 text-xs bg-background border-border/70 rounded-lg placeholder:text-muted-foreground/70"
                                    title="입력한 문장이 9:16 실물 미니어처 캔버스에 즉시 실시간 합성됩니다"
                                />
                            </div>
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
                                    title="큰 9:16 스마트폰 카드"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('small_card')}
                                    className={`p-1.5 rounded-md ${viewMode === 'small_card' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                    title="작은 9:16 스마트폰 카드"
                                >
                                    <Grid2X2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground'}`}
                                    title="목록 뷰"
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
                                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4'
                                    : 'grid-cols-1'
                            }`}>
                                {presets.map((preset) => {
                                    const isHovered = hoveredPresetId === preset.id;
                                    const isSelected = activePresetId === preset.id;

                                    // Computed real styling metadata
                                    const styleObj = preset.style || {};
                                    const vg = (styleObj as any).visual_geometry || {};
                                    const topBar = vg.top_bar || styleObj.title || {};
                                    const topTitle = vg.top_title || styleObj.title || {};
                                    const captionObj = vg.caption || styleObj.subtitle || {};
                                    const pacing = (styleObj as any).editing_pacing || (preset as any).pacing_dna || {};

                                    const boxColor = topBar.bg_color || topTitle.box_color || '#000000';
                                    const titleColor = topTitle.color || topTitle.text_color || '#FFE500';
                                    const captionColor = captionObj.color || captionObj.text_color || '#FFFFFF';
                                    const topHeightPct = topBar.height_pct || topBar.height || 16;
                                    const captionYPct = captionObj.y_pct || captionObj.position_y || 80;
                                    const captionStroke = captionObj.stroke_width || captionObj.stroke || 3;
                                    const cutTempo = pacing.avg_cut_sec || '0.8';
                                    const primaryFont = (preset as any).primary_font || topTitle.font || topTitle.font_family || 'Pretendard';

                                    // 2-Line High-Density Core Spec (Zero Vanity Fluff)
                                    const line1Spec = `📌 [상단바] ${boxColor.toUpperCase()} ${topHeightPct}% · ${titleColor.toUpperCase()} (${primaryFont})`;
                                    const line2Spec = `💬 [자막] 하단 ${captionYPct}% (외곽선 ${captionStroke}px) · ${cutTempo}초 컷 전환`;

                                    const displayText = liveHeadline.trim() || preset.name;

                                    return (
                                        <div
                                            key={preset.id}
                                            onMouseEnter={() => setHoveredPresetId(preset.id)}
                                            onMouseLeave={() => setHoveredPresetId(null)}
                                            onDoubleClick={() => handleSelect(preset)}
                                            className={`group relative rounded-2xl border transition-all overflow-hidden flex flex-col bg-card hover:shadow-xl ${
                                                isSelected
                                                    ? 'border-primary ring-2 ring-primary/40 shadow-lg'
                                                    : 'border-border/70 hover:border-primary/50'
                                            }`}
                                        >
                                            {/* 🌟 1. Card Top Utility Bar (배지와 액션 버튼을 프레임 밖으로 분리하여 타이틀 텍스트 가림 0% 원천 차단) */}
                                            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
                                                <div className="flex items-center gap-1.5 min-w-0 max-w-[65%]">
                                                    {preset.category && (
                                                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-background text-foreground border border-border/70 font-semibold shadow-2xs truncate">
                                                            {folders.find(f => f.id === preset.category)?.icon || '📁'} {folders.find(f => f.id === preset.category)?.name.split('/')[0].trim() || preset.category}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[9.5px] px-1.5 py-0.5 text-muted-foreground font-mono shrink-0">
                                                        v{preset.version || 1}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {preset.channel_url && (
                                                        <a
                                                            href={preset.channel_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-muted transition-colors"
                                                            title="원본 레퍼런스 채널/영상 보기"
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toast.success(`${preset.name} 즐겨찾기 상태가 변경되었습니다.`);
                                                        }}
                                                        className="p-1 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-muted transition-colors cursor-pointer"
                                                        title="즐겨찾기"
                                                    >
                                                        <Star className={`w-3.5 h-3.5 ${preset.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                                    </button>
                                                    {preset.source !== 'pixeling_official' && preset.source !== 'viraloop_official' && !preset.id.includes('official') && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeletePreset(preset, e)}
                                                            className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                            title="프리셋 및 관련 파일(영상/이미지/DB) 영구 삭제"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 🌟 2. 9:16 Smartphone Vertical Frame Area (100% 온전하게 노출되는 영상 및 미니어처) */}
                                            <div 
                                                className="relative aspect-[9/16] bg-neutral-950 overflow-hidden cursor-pointer select-none"
                                                onClick={() => {
                                                    // Clicking on frame opens detailed inspector for in-depth specs!
                                                    setInspectPreset(preset);
                                                    setInspectOpen(true);
                                                }}
                                            >
                                                {/* 1. Video playback on hover */}
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
                                                    </div>
                                                ) : (
                                                    /* 2. High-Fidelity 9:16 Real Smartphone Canvas Miniature */
                                                    <div className="w-full h-full relative bg-gradient-to-b from-neutral-900 via-neutral-950 to-black flex flex-col justify-between overflow-hidden">
                                                        {/* Top Bar Miniature: 좌우 100% 꽉 차는 실제 쇼츠 레터박스 상단바 */}
                                                        <div 
                                                            className="w-full px-3 py-2.5 flex items-center justify-center text-center shadow-sm transition-transform border-b border-white/10"
                                                            style={{
                                                                backgroundColor: boxColor,
                                                                minHeight: `${Math.max(14, Math.min(24, topHeightPct))}%`,
                                                            }}
                                                        >
                                                            <span 
                                                                className="text-[11px] font-black line-clamp-2 leading-tight tracking-tight px-1"
                                                                style={{
                                                                    color: titleColor,
                                                                    fontFamily: primaryFont
                                                                }}
                                                            >
                                                                {displayText}
                                                            </span>
                                                        </div>

                                                        {/* Center Stage: Safe Zone & Play Indicator */}
                                                        <div className="my-auto flex flex-col items-center justify-center p-2">
                                                            <div className="w-9 h-9 rounded-full bg-white/10 group-hover:bg-primary/20 flex items-center justify-center backdrop-blur-xs transition-all group-hover:scale-110">
                                                                <Play className="w-4 h-4 text-white/90 group-hover:text-primary fill-current ml-0.5" />
                                                            </div>
                                                            <span className="text-[10px] font-mono text-muted-foreground/70 mt-1.5">9:16 쇼츠 캔버스</span>
                                                        </div>

                                                        {/* Bottom Subtitle Miniature */}
                                                        <div className="w-full pb-7 text-center px-2">
                                                            <div 
                                                                className="inline-block px-2.5 py-1 rounded text-[11px] font-bold max-w-[90%]"
                                                                style={{
                                                                    color: captionColor,
                                                                    textShadow: `0 0 ${captionStroke}px #000, 0 0 ${captionStroke * 2}px #000`,
                                                                    fontFamily: primaryFont
                                                                }}
                                                            >
                                                                {liveHeadline.trim() || '자막 스타일 실시간 프리뷰'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 🌟 Frame Bottom: 사족 없는 꽉 찬 2줄 핵심 요약 오버레이 */}
                                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-3 pt-7 text-white select-none pointer-events-none">
                                                    <p className="text-[10.5px] font-semibold text-amber-300/95 truncate leading-snug">
                                                        {line1Spec}
                                                    </p>
                                                    <p className="text-[10.5px] font-medium text-white/90 truncate mt-0.5 leading-snug">
                                                        {line2Spec}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* 🌟 3. Info & Action Controls (Below Frame) */}
                                            <div className="p-3 flex-1 flex flex-col justify-between gap-2.5 bg-card">
                                                <div>
                                                    <h4 
                                                        className="text-xs font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                                        onClick={() => {
                                                            setInspectPreset(preset);
                                                            setInspectOpen(true);
                                                        }}
                                                        title={preset.name}
                                                    >
                                                        {preset.name}
                                                    </h4>

                                                    {/* Color Dots & Font Badge */}
                                                    <div className="flex items-center justify-between gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-mono text-muted-foreground/80">색상:</span>
                                                            <div className="flex items-center -space-x-1">
                                                                <span className="w-3.5 h-3.5 rounded-full border border-background shadow-xs shrink-0" style={{ backgroundColor: boxColor }} title={`상단바: ${boxColor}`} />
                                                                <span className="w-3.5 h-3.5 rounded-full border border-background shadow-xs shrink-0" style={{ backgroundColor: titleColor }} title={`타이틀: ${titleColor}`} />
                                                                <span className="w-3.5 h-3.5 rounded-full border border-background shadow-xs shrink-0" style={{ backgroundColor: captionColor }} title={`자막: ${captionColor}`} />
                                                            </div>
                                                        </div>

                                                        <span className="text-[10px] font-medium bg-muted/60 px-2 py-0.5 rounded border border-border/50 truncate max-w-[110px]" title={`폰트: ${primaryFont}`}>
                                                            {primaryFont}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 🌟 Action Buttons Row: [🔍 상세 스펙] vs [✨ 대화창 적용] 명확 분리 */}
                                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setInspectPreset(preset);
                                                            setInspectOpen(true);
                                                        }}
                                                        className="h-8 text-xs px-2 font-semibold border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                                    >
                                                        <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
                                                        상세 스펙
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleSelect(preset)}
                                                        className={`h-8 text-xs px-2 font-bold shadow-xs cursor-pointer gap-1.5 ${
                                                            isSelected 
                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                                                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                                        }`}
                                                    >
                                                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                                        {isSelected ? '선택됨' : '대화창 적용'}
                                                    </Button>
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
                    onOpenChange={(v) => {
                        setInspectOpen(v);
                        if (!v) fetchPresets();
                    }}
                    preset={inspectPreset}
                    onPresetUpdated={(updated) => {
                        fetchPresets();
                        setInspectPreset(updated);
                    }}
                    onSelectPreset={(p) => {
                        handleSelect(p);
                        setInspectOpen(false);
                    }}
                />
            )}
        </>
    );
};
