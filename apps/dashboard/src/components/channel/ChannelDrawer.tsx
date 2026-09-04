import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { Channel, Category } from '../../lib/api';
import { 
    Folder, FolderPlus, Search, FileText, RefreshCw, Trash2, Plus, 
    Check, X, Sparkles, ChevronRight, ExternalLink, Globe, HelpCircle, ArrowUpDown,
    MoreVertical, Download, Upload, FileSpreadsheet, FileCode, CheckSquare
} from 'lucide-react';
import { cn, getMediaUrl } from '../../lib/utils';
import { CategoryDNAModal } from '../shared/CategoryDNAModal';
import { Dna } from 'lucide-react';

const COLOR_PALETTE = [
    { key: 'none', label: '없음', bg: 'bg-muted border-border', strip: 'bg-transparent', ring: 'ring-border' },
    { key: 'red', label: '빨강', bg: 'bg-rose-500', strip: 'bg-rose-500', ring: 'ring-rose-500' },
    { key: 'orange', label: '주황', bg: 'bg-amber-500', strip: 'bg-amber-500', ring: 'ring-amber-500' },
    { key: 'green', label: '초록', bg: 'bg-emerald-500', strip: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { key: 'blue', label: '파랑', bg: 'bg-blue-500', strip: 'bg-blue-500', ring: 'ring-blue-500' },
    { key: 'purple', label: '보라', bg: 'bg-purple-500', strip: 'bg-purple-500', ring: 'ring-purple-500' },
];

interface ChannelDrawerProps {
    selectedChannelIds: Set<number>;
    onToggleChannel: (id: number) => void;
    onSelectChannels: (ids: number[]) => void;
    onCreatePresetWithChannels?: (channelIds: number[]) => void;
    onClose?: () => void;
}

export const ChannelDrawer: React.FC<ChannelDrawerProps> = ({
    selectedChannelIds,
    onToggleChannel,
    onSelectChannels,
    onCreatePresetWithChannels,
    onClose,
}) => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState<number | 'all' | 'unassigned'>('all');
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'subscribers' | 'recent'>('default');
    const [filterMemo, setFilterMemo] = useState<'all' | 'has_memo' | 'no_memo'>('all');
    const [filterLabel, setFilterLabel] = useState<string>('all');
    
    // Inline folder add (Level 0 Top & Level 1 Sub)
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isAddingSubFolder, setIsAddingSubFolder] = useState(false);
    const [newSubFolderName, setNewSubFolderName] = useState('');

    // Channel inline adder modal
    const [isAddingChannelModal, setIsAddingChannelModal] = useState(false);
    const [modalChannelUrl, setModalChannelUrl] = useState('');
    const [modalCategoryId, setModalCategoryId] = useState<number | null>(null);

    // Color & memo popovers
    const [activeColorPickerId, setActiveColorPickerId] = useState<number | null>(null);
    const [activeMemoId, setActiveMemoId] = useState<number | null>(null);
    const [memoText, setMemoText] = useState('');
    const [moveFolderDialogOpen, setMoveFolderDialogOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Category DNA Modal State
    const [dnaModalOpen, setDnaModalOpen] = useState(false);
    const [dnaModalCategory, setDnaModalCategory] = useState<Category | null>(null);
    const [dnaModalParentCategory, setDnaModalParentCategory] = useState<Category | null>(null);

    const handleOpenDnaModal = (cat: Category, parent?: Category | null) => {
        setDnaModalCategory(cat);
        setDnaModalParentCategory(parent || null);
        setDnaModalOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Queries
    const { data: channels = [], isLoading: isChannelsLoading } = useQuery({
        queryKey: ['channels'],
        queryFn: async () => (await api.get<Channel[]>('/channels/')).data || []
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => (await api.get<Category[]>('/categories/')).data || []
    });

    // Mutations
    const addFolderMutation = useMutation({
        mutationFn: ({ name, parent_id, level, color }: { name: string, parent_id?: number | null, level?: number, color?: string }) =>
            api.post('/categories/', { name, parent_id: parent_id || null, level: level || 0, color: color || '#3B82F6' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setNewFolderName('');
            setNewSubFolderName('');
            setIsAddingFolder(false);
            setIsAddingSubFolder(false);
        },
        onError: (err: any) => {
            alert('폴더 생성 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const deleteFolderMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/categories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            if (selectedFolderId === id) setSelectedFolderId('all');
        }
    });

    const addChannelMutation = useMutation({
        mutationFn: ({ url, categoryId }: { url: string, categoryId: number | null }) =>
            api.post('/channels/', { url, category_id: categoryId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setModalChannelUrl('');
            setIsAddingChannelModal(false);
            alert('채널이 성공적으로 등록되었습니다!');
        },
        onError: (err: any) => {
            alert('채널 추가 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    const updateChannelMetaMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: { color_label?: string, memo?: string } }) =>
            api.patch(`/channels/${id}/meta`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setActiveColorPickerId(null);
            setActiveMemoId(null);
        }
    });

    const batchMoveCategoryMutation = useMutation({
        mutationFn: ({ channelIds, categoryId }: { channelIds: number[], categoryId: number | null }) =>
            api.post('/channels/batch-move-category', { channel_ids: channelIds, category_id: categoryId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            setMoveFolderDialogOpen(false);
        }
    });

    const scanChannelMutation = useMutation({
        mutationFn: (id: number) => api.post(`/channels/${id}/scan`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        }
    });

    const deleteChannelMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/channels/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['channels'] });
        },
        onError: (err: any) => {
            alert('채널 삭제 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    // 2-Level Hierarchical Category Computations
    const parentCategories = useMemo(() => {
        return categories.filter(c => !c.parent_id || c.level === 0);
    }, [categories]);

    const subCategoriesByParent = useMemo(() => {
        const map: Record<number, Category[]> = {};
        categories.forEach(c => {
            if (c.parent_id) {
                if (!map[c.parent_id]) map[c.parent_id] = [];
                map[c.parent_id].push(c);
            }
        });
        return map;
    }, [categories]);

    const currentCategory = useMemo(() => {
        if (typeof selectedFolderId !== 'number') return null;
        return categories.find(c => c.id === selectedFolderId) || null;
    }, [categories, selectedFolderId]);

    const currentParentCategory = useMemo(() => {
        if (!currentCategory) return null;
        if (currentCategory.parent_id) {
            return categories.find(c => c.id === currentCategory.parent_id) || null;
        }
        return currentCategory;
    }, [categories, currentCategory]);

    const currentSubCategories = useMemo(() => {
        if (!currentParentCategory) return [];
        return subCategoriesByParent[currentParentCategory.id] || [];
    }, [currentParentCategory, subCategoriesByParent]);

    // Parent folder total counts (including sub-folders)
    const parentCategoryCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        parentCategories.forEach(parent => {
            const subIds = (subCategoriesByParent[parent.id] || []).map(s => s.id);
            const allIds = new Set([parent.id, ...subIds]);
            counts[parent.id] = channels.filter(ch => ch.category_id && allIds.has(ch.category_id)).length;
        });
        return counts;
    }, [parentCategories, subCategoriesByParent, channels]);

    // Filtered & Sorted Channels calculation (with Inheritance Filtering)
    const filteredChannels = useMemo(() => {
        let result = channels.filter(ch => {
            // Folder filter
            if (selectedFolderId === 'unassigned') {
                if (ch.category_id) return false;
            } else if (selectedFolderId !== 'all') {
                const isParent = parentCategories.some(p => p.id === selectedFolderId);
                if (isParent) {
                    const subIds = (subCategoriesByParent[selectedFolderId as number] || []).map(s => s.id);
                    const validIds = new Set([selectedFolderId, ...subIds]);
                    if (!ch.category_id || !validIds.has(ch.category_id)) return false;
                } else {
                    if (ch.category_id !== selectedFolderId) return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchName = ch.name.toLowerCase().includes(query);
                const matchUrl = ch.url.toLowerCase().includes(query);
                const matchMemo = (ch.memo || '').toLowerCase().includes(query);
                if (!matchName && !matchUrl && !matchMemo) return false;
            }

            // Color label filter
            if (filterLabel !== 'all') {
                if ((ch.color_label || 'none') !== filterLabel) return false;
            }

            // Memo filter
            if (filterMemo === 'has_memo') {
                if (!ch.memo || !ch.memo.trim()) return false;
            } else if (filterMemo === 'no_memo') {
                if (ch.memo && ch.memo.trim()) return false;
            }

            return true;
        });

        // Sorting
        if (sortBy === 'name') {
            result.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'subscribers') {
            result.sort((a, b) => (b.subscriber_count || 0) - (a.subscriber_count || 0));
        } else if (sortBy === 'recent') {
            result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        }

        return result;
    }, [channels, selectedFolderId, parentCategories, subCategoriesByParent, searchQuery, filterLabel, filterMemo, sortBy]);

    // Folder counts
    const unassignedCount = useMemo(() => channels.filter(c => !c.category_id).length, [channels]);
    const totalCount = channels.length;
    const memoHasCount = useMemo(() => channels.filter(c => c.memo && c.memo.trim()).length, [channels]);
    const memoNoCount = totalCount - memoHasCount;

    const handleOpenMemo = (ch: Channel) => {
        setActiveMemoId(ch.id);
        setMemoText(ch.memo || '');
    };

    const handleSaveMemo = (id: number) => {
        updateChannelMetaMutation.mutate({ id, data: { memo: memoText } });
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredChannels.map(c => c.id);
        const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedChannelIds.has(id));
        if (allSelected) {
            onSelectChannels([]);
        } else {
            onSelectChannels(filteredIds);
        }
    };

    const handleOpenExternalChannel = (url: string) => {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOpenAddChannelForCurrentFolder = () => {
        setModalCategoryId(typeof selectedFolderId === 'number' ? selectedFolderId : null);
        setIsAddingChannelModal(true);
    };

    // 1. JSON 백업 다운로드
    const handleExportJSON = () => {
        setIsMenuOpen(false);
        const data = {
            app: "ViraLoop Studio",
            version: "1.0",
            export_date: new Date().toISOString(),
            categories: categories,
            channels: channels
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `viraloop_channels_backup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 2. CSV 목록 다운로드 (한글 엑셀 호환 BOM 포함)
    const handleExportCSV = () => {
        setIsMenuOpen(false);
        const headers = ['이름', '플랫폼', 'URL', '카테고리', '구독자수', '색상라벨', '메모', '등록일'];
        const rows = channels.map(ch => {
            const cat = categories.find(c => c.id === ch.category_id);
            const catName = cat ? cat.name : '미분류';
            return [
                `"${(ch.name || '').replace(/"/g, '""')}"`,
                `"${(ch.platform || 'YouTube').replace(/"/g, '""')}"`,
                `"${(ch.url || '').replace(/"/g, '""')}"`,
                `"${catName.replace(/"/g, '""')}"`,
                ch.subscriber_count || 0,
                `"${ch.color_label || 'none'}"`,
                `"${(ch.memo || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                `"${ch.created_at || ''}"`
            ].join(',');
        });
        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `viraloop_channels_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 3. 선택 URL TXT 다운로드
    const handleExportURLs = () => {
        setIsMenuOpen(false);
        const targetList = selectedChannelIds.size > 0 
            ? channels.filter(c => selectedChannelIds.has(c.id))
            : filteredChannels;
        
        if (targetList.length === 0) {
            alert('다운로드할 채널이 없습니다.');
            return;
        }

        const urlsText = targetList.map(c => c.url).filter(Boolean).join('\n');
        const blob = new Blob([urlsText], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `viraloop_channel_urls_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 4. JSON 백업 업로드
    const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsMenuOpen(false);
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!data.channels || !Array.isArray(data.channels)) {
                throw new Error('유효한 채널 백업 파일 형식이 아닙니다.');
            }
            if (!window.confirm(`백업 파일에서 ${data.channels.length}개의 채널을 가져오시겠습니까?`)) {
                return;
            }
            // Import categories first if present
            const catMap = new Map<number, number>();
            if (data.categories && Array.isArray(data.categories)) {
                for (const cat of data.categories) {
                    const existingCat = categories.find(c => c.name === cat.name);
                    if (existingCat) {
                        catMap.set(cat.id, existingCat.id);
                    } else {
                        try {
                            const res = await api.post('/categories/', { name: cat.name, color: cat.color });
                            if (res.data?.id) catMap.set(cat.id, res.data.id);
                        } catch {}
                    }
                }
            }
            // Import channels
            let successCount = 0;
            for (const ch of data.channels) {
                try {
                    const newCatId = ch.category_id ? catMap.get(ch.category_id) || ch.category_id : null;
                    await api.post('/channels/', {
                        url: ch.url,
                        name: ch.name,
                        category_id: newCatId,
                        color_label: ch.color_label || 'none',
                        memo: ch.memo || ''
                    });
                    successCount++;
                } catch (chErr) {
                    // Skip duplicates
                }
            }
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            alert(`총 ${successCount}개의 채널을 성공적으로 복원했습니다!`);
        } catch (err: any) {
            alert('JSON 파일 가져오기 실패: ' + err.message);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <aside className="w-full lg:w-[480px] xl:w-[520px] border-l border-border bg-card/70 backdrop-blur-md flex flex-col h-full overflow-hidden text-card-foreground select-none relative">
            {/* Hidden File Input for JSON Import */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportJSONFile} 
                accept=".json" 
                className="hidden" 
            />

            {/* 1. Header */}
            <div className="p-3.5 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-primary" />
                    <div>
                        <h2 className="text-sm font-extrabold tracking-tight">채널 보관함</h2>
                        <p className="text-[10px] text-muted-foreground">카테고리 폴더 분류 및 정밀 라벨링</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 relative">
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['channels'] })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="새로고침"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    {/* More Menu Dropdown (JSON/CSV Export/Import) */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={cn(
                            "p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer",
                            isMenuOpen && "bg-muted text-foreground"
                        )}
                        title="데이터 관리 및 내보내기"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                            <div className="absolute right-0 top-9 w-52 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-1 z-50 text-xs font-semibold space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={handleExportJSON}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer text-foreground"
                                >
                                    <Download className="w-4 h-4 text-primary" />
                                    <span>JSON 백업 다운로드</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer text-foreground"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                    <span>CSV 목록 다운로드</span>
                                </button>
                                <button
                                    onClick={handleExportURLs}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer text-foreground"
                                >
                                    <Download className="w-4 h-4 text-indigo-500" />
                                    <span>선택 URL TXT 다운로드</span>
                                </button>
                                <div className="h-px bg-border/60 my-1" />
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        fileInputRef.current?.click();
                                    }}
                                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer text-foreground"
                                >
                                    <Upload className="w-4 h-4 text-amber-500" />
                                    <span>JSON 백업 업로드</span>
                                </button>
                            </div>
                        </>
                    )}

                    {onClose && (
                        <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Top Search & Sort & Memo Filter Bar */}
            <div className="p-2.5 border-b border-border/60 bg-background/50 space-y-2 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="채널명, URL, 메모 검색..."
                            className="w-full h-8 pl-8 pr-6 text-xs bg-muted/40 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    {/* Sort Selector */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-8 px-2 text-[11px] font-bold bg-muted/40 border border-input rounded-lg focus:outline-none cursor-pointer"
                    >
                        <option value="default">기본 순서</option>
                        <option value="name">이름순</option>
                        <option value="subscribers">구독자순</option>
                        <option value="recent">최근 등록순</option>
                    </select>
                </div>

                {/* Memo & Label Quick Filters */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setFilterMemo('all')}
                            className={cn(
                                "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                                filterMemo === 'all' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            전체 {totalCount}
                        </button>
                        <button
                            onClick={() => setFilterMemo('has_memo')}
                            className={cn(
                                "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                                filterMemo === 'has_memo' ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            메모 {memoHasCount}
                        </button>
                        <button
                            onClick={() => setFilterMemo('no_memo')}
                            className={cn(
                                "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                                filterMemo === 'no_memo' ? "bg-muted text-foreground font-extrabold" : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            미작성 {memoNoCount}
                        </button>
                    </div>

                    {/* Color Label Filter Chips */}
                    <div className="flex items-center gap-1">
                        {COLOR_PALETTE.filter(c => c.key !== 'none').map(col => (
                            <button
                                key={col.key}
                                onClick={() => setFilterLabel(filterLabel === col.key ? 'all' : col.key)}
                                className={cn(
                                    "w-3.5 h-3.5 rounded-full border transition-all cursor-pointer",
                                    col.bg,
                                    filterLabel === col.key ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-60 hover:opacity-100"
                                )}
                                title={col.label}
                            />
                        ))}
                    </div>
                </div>

                {/* [MOBILE ONLY] Horizontal Scrollable Folder Chips Bar */}
                <div className="md:hidden flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar text-xs">
                    <button
                        onClick={() => setSelectedFolderId('all')}
                        className={cn(
                            "px-2.5 py-1 rounded-lg shrink-0 font-bold flex items-center gap-1 transition-all cursor-pointer",
                            selectedFolderId === 'all'
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Globe className="w-3 h-3" />
                        <span>전체 ({totalCount})</span>
                    </button>
                    <button
                        onClick={() => setSelectedFolderId('unassigned')}
                        className={cn(
                            "px-2.5 py-1 rounded-lg shrink-0 font-bold flex items-center gap-1 transition-all cursor-pointer",
                            selectedFolderId === 'unassigned'
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <HelpCircle className="w-3 h-3" />
                        <span>미분류 ({unassignedCount})</span>
                    </button>
                    {categories.map((cat) => {
                        const count = channels.filter(c => c.category_id === cat.id).length;
                        const isSelected = selectedFolderId === cat.id;
                        return (
                            <button
                                key={`m-cat-${cat.id}`}
                                onClick={() => setSelectedFolderId(cat.id)}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg shrink-0 font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                                    isSelected
                                        ? "bg-primary text-primary-foreground shadow-xs"
                                        : "bg-muted/50 border border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
                                <span>{cat.name} ({count})</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsAddingFolder(true)}
                        className="px-2 py-1 rounded-lg shrink-0 text-xs font-bold text-primary border border-primary/30 hover:bg-primary/10 flex items-center gap-1 cursor-pointer"
                    >
                        <Plus className="w-3 h-3" />
                        폴더
                    </button>
                </div>
            </div>

            {/* 3. Main Workspace: Desktop 2-Column vs Mobile Full-Width List */}
            <div className="flex-1 flex overflow-hidden">
                {/* 3-A. [DESKTOP ONLY] Left Vertical Folder Tree Panel (Hidden on Mobile) */}
                <div className="hidden md:flex w-36 sm:w-40 border-r border-border bg-muted/10 flex-col justify-between shrink-0 select-none">
                    {/* Folders List */}
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar text-xs">
                        {/* All Channels */}
                        <button
                            onClick={() => setSelectedFolderId('all')}
                            className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center justify-between transition-all cursor-pointer",
                                selectedFolderId === 'all'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <Globe className="w-3.5 h-3.5 shrink-0" />
                                <span>전체</span>
                            </span>
                            <span className="text-[10px] opacity-80 shrink-0">{totalCount}</span>
                        </button>

                        {/* Unassigned Folder */}
                        <button
                            onClick={() => setSelectedFolderId('unassigned')}
                            className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center justify-between transition-all cursor-pointer",
                                selectedFolderId === 'unassigned'
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>미분류</span>
                            </span>
                            <span className="text-[10px] opacity-80 shrink-0">{unassignedCount}</span>
                        </button>

                        <div className="pt-1 pb-1 border-t border-border/40 my-1">
                            <span className="text-[10px] font-bold text-muted-foreground px-2">내 폴더 목록</span>
                        </div>

                        {/* Custom Categories (Level 0 Top Folders Only) */}
                        {parentCategories.map((cat) => {
                            const count = parentCategoryCounts[cat.id] ?? 0;
                            const isSelected = selectedFolderId === cat.id || currentParentCategory?.id === cat.id;
                            const hasSub = (subCategoriesByParent[cat.id] || []).length > 0;

                            return (
                                <div
                                    key={cat.id}
                                    className={cn(
                                        "group/folder w-full rounded-lg font-medium flex items-center justify-between px-2 py-1.5 transition-all cursor-pointer",
                                        isSelected
                                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                    onClick={() => setSelectedFolderId(cat.id)}
                                >
                                    <div className="flex items-center gap-1.5 truncate min-w-0">
                                        <Folder className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-primary-foreground" : "text-amber-500")} />
                                        <span className="truncate" title={cat.name}>{cat.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] opacity-80 font-mono">{count}</span>
                                        {hasSub && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 text-white/90">
                                                +{subCategoriesByParent[cat.id].length}
                                            </span>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDnaModal(cat);
                                            }}
                                            className={cn(
                                                "p-0.5 rounded hover:bg-black/20 transition-all",
                                                cat.persona_target ? "text-indigo-400 opacity-100" : "opacity-0 group-hover/folder:opacity-80 text-muted-foreground"
                                            )}
                                            title="카테고리 DNA / FSD 기준 설정"
                                        >
                                            <Dna className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`'${cat.name}' 상위 폴더를 삭제하시겠습니까? (하위 폴더와 소속 채널은 미분류로 이동)`)) {
                                                    deleteFolderMutation.mutate(cat.id);
                                                }
                                            }}
                                            className="opacity-0 group-hover/folder:opacity-100 hover:text-destructive transition-opacity p-0.5"
                                            title="폴더 삭제"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Add Folder Action */}
                    <div className="p-2 border-t border-border bg-card/40 shrink-0">
                        {isAddingFolder ? (
                            <div className="space-y-1">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newFolderName.trim()) {
                                            addFolderMutation.mutate({ name: newFolderName.trim(), level: 0 });
                                        }
                                    }}
                                    placeholder="상위 폴더 이름..."
                                    className="w-full h-6 text-xs px-1.5 rounded bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                                    autoFocus
                                />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            if (newFolderName.trim()) addFolderMutation.mutate({ name: newFolderName.trim(), level: 0 });
                                        }}
                                        className="flex-1 h-5 text-[10px] font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                    >
                                        생성
                                    </button>
                                    <button
                                        onClick={() => setIsAddingFolder(false)}
                                        className="px-1.5 h-5 text-[10px] text-muted-foreground hover:text-foreground"
                                    >
                                        취소
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingFolder(true)}
                                className="w-full py-1.5 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center justify-center gap-1 border border-primary/20 transition-colors cursor-pointer"
                            >
                                <Plus className="w-3 h-3" />
                                새 폴더 추가
                            </button>
                        )}
                    </div>
                </div>

                {/* 3-B. Right Channel List Panel (flex-1) */}
                <div className="flex-1 flex flex-col overflow-hidden bg-background">
                    {/* 픽셀링 스타일 상단 알림 배너 */}
                    {currentParentCategory && (
                        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-1.5 truncate">
                                <span>현재</span>
                                <span className="font-bold underline">
                                    {currentCategory?.parent_id 
                                        ? `${currentParentCategory.name} > ${currentCategory.name}`
                                        : currentParentCategory.name}
                                </span>
                                <span>범위만 보고 있습니다. (전체 {totalCount}개 중 {filteredChannels.length}개 표시)</span>
                            </div>
                            <button 
                                onClick={() => setSelectedFolderId('all')}
                                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold shrink-0 ml-2 cursor-pointer transition-colors"
                            >
                                전체 보기
                            </button>
                        </div>
                    )}

                    {/* 픽셀링 스타일 하위 폴더 목록 카드 및 + 하위 폴더 추가 섹션 */}
                    {currentParentCategory && (
                        <div className="p-2.5 bg-muted/20 border-b border-border/60 space-y-2 select-none shrink-0">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-foreground">
                                    <button
                                        onClick={() => setSelectedFolderId(currentParentCategory.id)}
                                        className={cn(
                                            "hover:text-primary transition-colors cursor-pointer",
                                            !currentCategory?.parent_id ? "text-primary font-extrabold" : "text-muted-foreground"
                                        )}
                                    >
                                        {currentParentCategory.name}
                                    </button>
                                    {currentCategory?.parent_id && (
                                        <>
                                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-primary font-extrabold">{currentCategory.name}</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground text-[11px] font-normal ml-1">
                                        채널 {filteredChannels.length}개
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleOpenDnaModal(currentCategory || currentParentCategory, currentCategory?.parent_id ? currentParentCategory : null)}
                                    className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                    title="카테고리 페르소나 및 자율주행 탐색 기준 설정"
                                >
                                    <Dna className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>🧬 DNA 기준 설정</span>
                                    {(currentCategory?.persona_target || currentParentCategory?.persona_target) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                    )}
                                </button>
                            </div>

                            {/* 하위 폴더 카드 리스트 */}
                            {currentSubCategories.length > 0 && (
                                <div className="space-y-1.5">
                                    {currentSubCategories.map(sub => {
                                        const subCount = channels.filter(c => c.category_id === sub.id).length;
                                        const isSubSelected = selectedFolderId === sub.id;

                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={() => setSelectedFolderId(sub.id)}
                                                className={cn(
                                                    "group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer",
                                                    isSubSelected
                                                        ? "bg-primary/10 border-primary/60 ring-1 ring-primary/30"
                                                        : "bg-card hover:bg-muted/50 border-border/70 shadow-2xs"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                                                    <span className="font-bold text-xs text-foreground truncate">{sub.name}</span>
                                                    <span className="text-[11px] text-muted-foreground">{subCount}개 채널</span>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDnaModal(sub, currentParentCategory);
                                                        }}
                                                        className={cn(
                                                            "p-1 rounded hover:bg-muted transition-all",
                                                            sub.persona_target ? "text-indigo-400 opacity-100" : "opacity-0 group-hover:opacity-80 text-muted-foreground"
                                                        )}
                                                        title="하위 폴더 DNA 설정"
                                                    >
                                                        <Dna className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`'${sub.name}' 하위 폴더를 삭제하시겠습니까? (채널은 미분류로 이동)`)) {
                                                                deleteFolderMutation.mutate(sub.id);
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                                                        title="하위 폴더 삭제"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* + 하위 폴더 추가 버튼 및 인라인 폼 */}
                            {isAddingSubFolder ? (
                                <div className="p-2 rounded-xl border border-primary/40 bg-background shadow-xs space-y-1.5 animate-in fade-in">
                                    <input
                                        type="text"
                                        value={newSubFolderName}
                                        onChange={(e) => setNewSubFolderName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSubFolderName.trim()) {
                                                addFolderMutation.mutate({
                                                    name: newSubFolderName.trim(),
                                                    parent_id: currentParentCategory.id,
                                                    level: 1
                                                });
                                            }
                                        }}
                                        placeholder={`'${currentParentCategory.name}'의 하위 폴더 이름...`}
                                        className="w-full h-7 text-xs px-2 rounded-lg bg-muted/30 border border-input focus:outline-none focus:ring-1 focus:ring-primary"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                        <button
                                            onClick={() => setIsAddingSubFolder(false)}
                                            className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (newSubFolderName.trim()) {
                                                    addFolderMutation.mutate({
                                                        name: newSubFolderName.trim(),
                                                        parent_id: currentParentCategory.id,
                                                        level: 1
                                                    });
                                                }
                                            }}
                                            className="px-2.5 py-1 text-[11px] font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 cursor-pointer shadow-xs"
                                        >
                                            하위 폴더 생성
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingSubFolder(true)}
                                    className="w-full py-1.5 px-2 rounded-xl border border-dashed border-border/80 hover:border-primary/50 text-muted-foreground hover:text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-background/50 hover:bg-muted/30"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>하위 폴더 추가</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* Header: Filtered Count */}
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] bg-muted/20 border-b border-border/40 text-muted-foreground shrink-0">
                        <span className="font-semibold">
                            {filteredChannels.length}개 채널
                        </span>
                        <button
                            onClick={handleSelectAllFiltered}
                            className="hover:text-foreground font-bold hover:underline transition-colors cursor-pointer"
                        >
                            {filteredChannels.length > 0 && filteredChannels.every(c => selectedChannelIds.has(c.id))
                                ? '선택 해제'
                                : '전체 선택'}
                        </button>
                    </div>

                    {/* Channels Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-2 pb-28 sm:pb-2 space-y-1.5 custom-scrollbar">
                        {isChannelsLoading ? (
                            <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground space-y-2">
                                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                                <span>채널 목록 로딩 중...</span>
                            </div>
                        ) : filteredChannels.length === 0 ? (
                            <div className="text-center py-16 text-xs text-muted-foreground space-y-2">
                                <p>해당 폴더에 채널이 없습니다.</p>
                                <button
                                    onClick={handleOpenAddChannelForCurrentFolder}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    이 폴더에 채널 추가하기
                                </button>
                            </div>
                        ) : (
                            filteredChannels.map((ch) => {
                                const isSelected = selectedChannelIds.has(ch.id);
                                const currentColor = COLOR_PALETTE.find(c => c.key === (ch.color_label || 'none')) || COLOR_PALETTE[0];

                                return (
                                    <div
                                        key={ch.id}
                                        className={cn(
                                            "relative group flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all duration-200 overflow-hidden",
                                            isSelected 
                                                ? "bg-primary/10 border-primary/60 shadow-sm ring-1 ring-primary/30" 
                                                : "bg-card/80 dark:bg-zinc-900/70 border-border/70 dark:border-white/10 hover:border-primary/40 hover:bg-muted/40 hover:shadow-xs"
                                        )}
                                    >
                                        {/* Left Color Strip Indicator */}
                                        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-r-xs", currentColor.strip)} />

                                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1.5">
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onToggleChannel(ch.id)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                                            />

                                            {/* Avatar */}
                                            <div 
                                                onClick={() => handleOpenExternalChannel(ch.url)}
                                                className="relative w-9 h-9 rounded-full overflow-hidden bg-muted/80 shrink-0 border border-border/80 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                                                title="클릭하여 유튜브 채널 열기"
                                            >
                                                {ch.thumbnail_path ? (
                                                    <img 
                                                        src={getMediaUrl(ch.thumbnail_path)} 
                                                        alt={ch.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-muted-foreground uppercase bg-gradient-to-br from-primary/10 to-primary/20">
                                                        {ch.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Channel Info & Link */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Channel Name with Clickable External Link */}
                                                    <button
                                                        onClick={() => handleOpenExternalChannel(ch.url)}
                                                        className="text-xs sm:text-sm font-extrabold text-foreground truncate hover:text-primary hover:underline flex items-center gap-1 text-left cursor-pointer transition-colors"
                                                        title={`${ch.name} (클릭하여 채널 링크 열기)`}
                                                    >
                                                        <span className="truncate">{ch.name}</span>
                                                        <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </button>
                                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted/80 text-muted-foreground font-bold shrink-0 uppercase tracking-tight">
                                                        {ch.platform === 'YoutubeTab' ? 'YT' : ch.platform}
                                                    </span>
                                                </div>

                                                {/* Sub count & folder */}
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                                    {ch.subscriber_count ? (
                                                        <span className="font-medium">구독자 {(ch.subscriber_count / 10000).toFixed(1)}만</span>
                                                    ) : null}
                                                    {ch.category_id && (
                                                        <span className="text-primary font-bold truncate max-w-[100px]">
                                                            📁 {categories.find(c => c.id === ch.category_id)?.name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Memo Snippet if exists */}
                                                {ch.memo && ch.memo.trim() && (
                                                    <p 
                                                        onClick={() => handleOpenMemo(ch)}
                                                        className="text-[10px] text-amber-500 dark:text-amber-400 mt-1 line-clamp-1 italic cursor-pointer hover:underline flex items-center gap-1 font-medium"
                                                        title="클릭하여 메모 수정"
                                                    >
                                                        <span>📝</span>
                                                        <span className="truncate">{ch.memo}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions: Color Dot Palette + Memo + Scan + Delete */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Color Label Trigger */}
                                            <button
                                                onClick={() => setActiveColorPickerId(activeColorPickerId === ch.id ? null : ch.id)}
                                                className={cn(
                                                    "w-3.5 h-3.5 rounded-full border shadow-xs transition-transform hover:scale-125 cursor-pointer",
                                                    currentColor.bg
                                                )}
                                                title={`라벨: ${currentColor.label} (클릭하여 변경)`}
                                            />

                                            {/* Memo */}
                                            <button
                                                onClick={() => handleOpenMemo(ch)}
                                                className={cn(
                                                    "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer",
                                                    ch.memo ? "text-amber-500 font-bold" : "opacity-60 group-hover:opacity-100"
                                                )}
                                                title="메모 작성/보기"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Scan / Refresh channel */}
                                            <button
                                                onClick={() => scanChannelMutation.mutate(ch.id)}
                                                disabled={scanChannelMutation.isPending}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                                                title="채널 정보 및 썸네일 새로고침"
                                            >
                                                <RefreshCw className={cn("w-3.5 h-3.5", scanChannelMutation.isPending && "animate-spin")} />
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`'${ch.name}' 채널을 보관함에서 삭제하시겠습니까?`)) {
                                                        deleteChannelMutation.mutate(ch.id);
                                                    }
                                                }}
                                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-60 group-hover:opacity-100 cursor-pointer"
                                                title="채널 삭제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Color Picker Popover */}
                                        {activeColorPickerId === ch.id && (
                                            <div className="absolute right-2 top-8 z-30 bg-popover border border-border shadow-lg rounded-lg p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95">
                                                {COLOR_PALETTE.map(col => (
                                                    <button
                                                        key={col.key}
                                                        onClick={() => updateChannelMetaMutation.mutate({ id: ch.id, data: { color_label: col.key } })}
                                                        className={cn(
                                                            "w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 cursor-pointer",
                                                            col.bg,
                                                            (ch.color_label || 'none') === col.key && "ring-2 ring-primary ring-offset-1"
                                                        )}
                                                        title={col.label}
                                                    />
                                                ))}
                                                <button onClick={() => setActiveColorPickerId(null)} className="ml-1 text-muted-foreground hover:text-foreground cursor-pointer">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer: Add Channel Button & Quick Stats */}
                    <div className="p-2 pb-20 sm:pb-2 border-t border-border bg-card/60 flex items-center justify-between shrink-0">
                        <button
                            onClick={handleOpenAddChannelForCurrentFolder}
                            className="py-1.5 px-3 text-xs font-bold bg-muted hover:bg-muted/80 text-foreground rounded-lg flex items-center gap-1.5 border border-border transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            채널 추가
                        </button>
                        <span className="text-[10px] text-muted-foreground">
                            {selectedChannelIds.size > 0 ? `${selectedChannelIds.size}개 선택됨` : `총 ${totalCount}개`}
                        </span>
                    </div>
                </div>
            </div>

            {/* 4. Bottom Floating Actions (Appears when channels selected) */}
            {selectedChannelIds.size > 0 && (
                <div className="p-3 pb-20 sm:pb-3 border-t border-border bg-card shadow-2xl space-y-2 shrink-0 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                        <span className="flex items-center gap-1 text-primary">
                            <Check className="w-4 h-4" />
                            {selectedChannelIds.size}개 채널 선택됨
                        </span>
                        <button
                            onClick={() => onSelectChannels([])}
                            className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            선택 해제
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {onCreatePresetWithChannels && (
                            <button
                                onClick={() => onCreatePresetWithChannels(Array.from(selectedChannelIds))}
                                className="col-span-2 py-2 px-3 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:bg-primary/90 flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                선택 채널로 새 프리셋 생성
                            </button>
                        )}

                        <button
                            onClick={() => setMoveFolderDialogOpen(true)}
                            className="py-1.5 px-2 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-lg flex items-center justify-center gap-1 border border-border cursor-pointer"
                        >
                            <Folder className="w-3.5 h-3.5" />
                            폴더로 이동
                        </button>

                        <button
                            onClick={async () => {
                                if (!window.confirm(`선택한 ${selectedChannelIds.size}개 채널을 삭제하시겠습니까?`)) return;
                                try {
                                    await api.post('/channels/batch-delete', { channel_ids: Array.from(selectedChannelIds) });
                                    queryClient.invalidateQueries({ queryKey: ['channels'] });
                                    onSelectChannels([]);
                                } catch (e) {
                                    alert('삭제 실패');
                                }
                            }}
                            className="py-1.5 px-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-xs rounded-lg flex items-center justify-center gap-1 border border-destructive/20 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            일괄 삭제
                        </button>
                    </div>
                </div>
            )}

            {/* Memo Modal Dialog */}
            {activeMemoId !== null && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-sm font-bold flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-amber-500" />
                                채널 메모 작성
                            </h3>
                            <button onClick={() => setActiveMemoId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <textarea
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="채널 분석 메모, 주요 벤치마킹 포인트, 톤앤매너 등을 기록하세요..."
                            rows={4}
                            className="w-full text-xs p-2.5 rounded-lg bg-muted/40 border border-border focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setActiveMemoId(null)}
                                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => handleSaveMemo(activeMemoId)}
                                className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Move Dialog */}
            {moveFolderDialogOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-sm font-bold flex items-center gap-1.5">
                                <Folder className="w-4 h-4 text-primary" />
                                폴더로 일괄 이동 ({selectedChannelIds.size}개)
                            </h3>
                            <button onClick={() => setMoveFolderDialogOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => batchMoveCategoryMutation.mutate({ channelIds: Array.from(selectedChannelIds), categoryId: null })}
                                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted font-medium flex items-center justify-between cursor-pointer"
                            >
                                <span>📁 미분류로 이동</span>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => batchMoveCategoryMutation.mutate({ channelIds: Array.from(selectedChannelIds), categoryId: cat.id })}
                                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted font-medium flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />
                                        <span>{cat.name}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Adding Channel with Category Binding */}
            {isAddingChannelModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-4 space-y-3.5 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-sm font-bold flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-primary" />
                                새 타겟 채널 추가
                            </h3>
                            <button onClick={() => setIsAddingChannelModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-foreground">채널 URL 또는 @핸들 *</label>
                                <input
                                    type="text"
                                    value={modalChannelUrl}
                                    onChange={(e) => setModalChannelUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/@channel..."
                                    className="w-full h-8 px-2.5 text-xs bg-muted/40 border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-foreground">소속 카테고리 폴더</label>
                                <select
                                    value={modalCategoryId || ''}
                                    onChange={(e) => setModalCategoryId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full h-8 px-2 text-xs bg-background border border-input rounded-lg font-semibold cursor-pointer"
                                >
                                    <option value="">📁 미분류</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>📁 {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                onClick={() => setIsAddingChannelModal(false)}
                                className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-lg cursor-pointer"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    if (!modalChannelUrl.trim()) return alert('채널 URL을 입력해 주세요.');
                                    addChannelMutation.mutate({ url: modalChannelUrl.trim(), categoryId: modalCategoryId });
                                }}
                                disabled={addChannelMutation.isPending}
                                className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs cursor-pointer"
                            >
                                {addChannelMutation.isPending ? '등록 중...' : '채널 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category DNA Standards Modal */}
            <CategoryDNAModal
                open={dnaModalOpen}
                onOpenChange={setDnaModalOpen}
                category={dnaModalCategory}
                parentCategory={dnaModalParentCategory}
            />
        </aside>
    );
};
export default ChannelDrawer;

