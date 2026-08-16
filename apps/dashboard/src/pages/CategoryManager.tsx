import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
    FolderTree, Folder, FolderOpen, Users, 
    ChevronDown, Sparkles, Plus, 
    RefreshCw, Trash2, Globe, Search, AlertCircle, Eye,
    Video, Calendar, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function CategoryManager() {
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
    const queryClient = useQueryClient();

    React.useEffect(() => {
        setSelectedChannels([]);
    }, [selectedCategory]);

    // Query for category tree
    const { data: tree = [], isLoading: treeLoading } = useQuery({
        queryKey: ['categoryTree'],
        queryFn: async () => {
            const res = await api.get('/categories/tree');
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    // Query for channel pool of selected category (or all if none selected)
    const { data: channelPool = [], isLoading: poolLoading } = useQuery({
        queryKey: ['categoryPool', selectedCategory?.id || 'all'],
        queryFn: async () => {
            const endpoint = selectedCategory?.id 
                ? `/categories/${selectedCategory.id}/pool`
                : '/categories/pool';
            const res = await api.get(endpoint);
            return Array.isArray(res.data) ? res.data : [];
        }
    });

    const displayChannels = Array.isArray(channelPool) ? channelPool : [];

    // Mutation to trigger channel discovery
    const discoverMutation = useMutation({
        mutationFn: async (categoryId: number) => {
            return api.post(`/categories/${categoryId}/discover`);
        },
        onSuccess: () => {
            toast.success("AI 채널 탐색이 시작되었습니다.");
        },
        onError: () => {
            toast.error("채널 탐색에 실패했습니다.");
        }
    });

    // Mutation to trigger all channel discovery
    const discoverAllMutation = useMutation({
        mutationFn: async () => {
            return api.post('/categories/discover-all');
        },
        onSuccess: () => {
            toast.success("전체 카테고리의 AI 채널 탐색이 시작되었습니다.");
        },
        onError: () => {
            toast.error("전체 채널 탐색에 실패했습니다.");
        }
    });

    const resetMutation = useMutation({
        mutationFn: async () => {
            return api.post('/categories/reset');
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['categoryTree'] });
            queryClient.invalidateQueries({ queryKey: ['categoryPool'] });
            setSelectedCategory(null);
            setSelectedChannels([]);
            toast.success(res.data?.message || "시그널 탐지 데이터가 초기화되었습니다.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || "초기화에 실패했습니다.";
            toast.error(msg);
        }
    });

    const handleReset = () => {
        if (window.confirm(
            "⚠️ 정말로 모든 시그널 탐지 데이터를 초기화하시겠습니까?\n\n" +
            "• 모든 수집 채널(Discovery Channels)이 삭제됩니다.\n" +
            "• 모든 수집 영상(Discovery Videos)이 삭제됩니다.\n" +
            "• AI가 생성한 소카테고리가 모두 삭제됩니다.\n" +
            "• 스카우트 후보/전략 브리프 데이터가 삭제됩니다.\n" +
            "• 고정 카테고리(유튜브 기본 분류)와 수동 추가 카테고리는 유지됩니다.\n\n" +
            "이 작업은 되돌릴 수 없습니다."
        )) {
            if (window.confirm("⚠️ 정말 확실합니까? 모든 수집 데이터가 사라집니다.")) {
                resetMutation.mutate();
            }
        }
    };

    const bulkDeleteMutation = useMutation({
        mutationFn: async (data: { channel_ids?: number[], category_id?: number }) => {
            return api.post('/categories/channels/bulk-delete', data);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['categoryPool'] });
            queryClient.invalidateQueries({ queryKey: ['categoryTree'] });
            setSelectedChannels([]);
            toast.success(res.data?.message || "선택한 채널들이 성공적으로 삭제되었습니다.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || "채널 일괄 삭제에 실패했습니다.";
            toast.error(msg);
        }
    });

    // Mutation to create a category/niche
    const createCategoryMutation = useMutation({
        mutationFn: async (data: { name: string; parent_id?: number; level: number }) => {
            return api.post('/categories', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryTree'] });
            setIsAddModalOpen(false);
            setNewCategoryName('');
            toast.success("카테고리가 추가되었습니다.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || "카테고리 추가에 실패했습니다.";
            toast.error(msg);
        }
    });

    // Mutation to delete a category
    const deleteCategoryMutation = useMutation({
        mutationFn: async (id: number) => {
            return api.delete(`/categories/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categoryTree'] });
            setSelectedCategory(null);
            toast.success("카테고리가 성공적으로 삭제되었습니다.");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.detail || "카테고리 삭제에 실패했습니다.";
            toast.error(msg);
        }
    });

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        const parentId = selectedCategory?.id;
        const parentLevel = selectedCategory?.level ?? -1;
        const targetLevel = parentLevel + 1;

        if (targetLevel > 2) {
            toast.error("소분류(Level 2) 아래에는 하위 분류를 추가할 수 없습니다.");
            return;
        }

        createCategoryMutation.mutate({
            name: newCategoryName.trim(),
            parent_id: parentId,
            level: targetLevel
        });
    };

    const handleDeleteCategory = (cat: any) => {
        if (!cat) return;
        if (cat.is_fixed || cat.level === 0) {
            toast.error("유튜브 기본 대분류 카테고리는 삭제할 수 없습니다.");
            return;
        }

        if (window.confirm(`정말로 "${cat.name}" 카테고리를 삭제하시겠습니까?\n하위 채널 및 미디어 정보가 모두 함께 삭제될 수 있습니다.`)) {
            deleteCategoryMutation.mutate(cat.id);
        }
    };

    const handleBulkDelete = () => {
        if (selectedChannels.length > 0) {
            if (window.confirm(`선택한 ${selectedChannels.length}개의 채널을 삭제하시겠습니까?`)) {
                bulkDeleteMutation.mutate({ channel_ids: selectedChannels });
            }
        } else if (selectedCategory) {
            if (window.confirm(`"${selectedCategory.name}" 카테고리의 모든 채널을 삭제하시겠습니까?\n하위 분류의 채널도 모두 삭제됩니다.`)) {
                bulkDeleteMutation.mutate({ category_id: selectedCategory.id });
            }
        }
    };

    const toggleChannelSelection = (id: number) => {
        setSelectedChannels(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const toggleAllChannels = () => {
        if (selectedChannels.length === displayChannels.length) {
            setSelectedChannels([]);
        } else {
            setSelectedChannels(displayChannels.map((c: any) => c.id));
        }
    };

    const getCleanChannelName = (ch: any) => {
        if (!ch.name) return '이름 없음';
        if (ch.name.startsWith('Seed UC')) {
            const idPart = ch.name.replace('Seed ', '');
            return `채널 (${idPart.substring(0, 8)}...)`;
        }
        return ch.name;
    };

    const formatSubscriberCount = (count: number) => {
        if (!count || count <= 0) return '-';
        if (count >= 10000) return (count / 10000).toFixed(1) + '만';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
        return count.toLocaleString();
    };

    const formatViews = (num: number) => {
        if (!num || num <= 0) return '-';
        if (num >= 100000000) return (num / 100000000).toFixed(1) + '억';
        if (num >= 10000) return (num / 10000).toFixed(1) + '만';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toLocaleString();
    };

    const toggleExpand = (e: React.MouseEvent, nodeId: number) => {
        e.stopPropagation();
        setExpandedNodes(prev => ({
            ...prev,
            [nodeId]: !prev[nodeId]
        }));
    };

    const renderTree = (nodes: any[], level = 0) => {
        if (!Array.isArray(nodes)) return null;
        return nodes.map(node => {
            const isExpanded = expandedNodes[node.id] !== false; // Default to expanded or set true
            
            return (
            <div key={node.id} className="w-full">
                <div 
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all ${
                        selectedCategory?.id === node.id 
                            ? 'bg-pink-50 text-pink-600 font-bold border-l-4 border-pink-500' 
                            : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    style={{ paddingLeft: `${selectedCategory?.id === node.id ? (level * 16) + 8 : (level * 16) + 12}px` }}
                    onClick={() => setSelectedCategory(node)}
                >
                    {node.children && node.children.length > 0 ? (
                        <div onClick={(e) => toggleExpand(e, node.id)} className="p-1 hover:bg-slate-200 rounded">
                            <ChevronDown className={`w-4 h-4 transition-transform ${!isExpanded ? '-rotate-90' : ''} ${selectedCategory?.id === node.id ? 'text-pink-500' : 'text-slate-400'}`} />
                        </div>
                    ) : (
                        <div className="w-6" />
                    )}
                    <Folder className={`w-4 h-4 shrink-0 ${
                        node.level === 0 ? 'text-blue-500' : node.level === 1 ? 'text-indigo-500' : 'text-pink-500'
                    }`} />
                    <span className="text-sm font-medium truncate">
                        {node.name} 
                        <span className="text-slate-400 font-normal">
                            {' '}({node.channel_count || 0}) 
                            {node.avg_views > 0 && ` / ${formatViews(Math.round(node.avg_views))}`}
                        </span>
                    </span>
                </div>
                {node.children && node.children.length > 0 && isExpanded && (
                    <div className="w-full flex flex-col mt-0.5">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
            );
        });
    };

    return (
        <div className="w-full h-full flex flex-col px-6 py-6 space-y-6 bg-slate-50/50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900">
                        <FolderTree className="w-8 h-8 text-pink-500" />
                        카테고리 매니저
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">유튜브 채널 풀의 카테고리 계층 구조를 관리하고 신규 니치를 모니터링합니다.</p>
                </div>
                <button 
                    onClick={() => {
                        setSelectedCategory(null);
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition-all shadow-[0_2px_10px_rgba(219,39,119,0.2)] text-sm"
                >
                    <Plus className="w-4 h-4" />
                    대분류 추가
                </button>
            </div>

            <div className="flex flex-1 gap-6 min-h-[500px]">
                {/* Left Panel: Category Tree */}
                <div className="w-80 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-sm">
                    <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-3">
                        <FolderOpen className="w-4 h-4 text-slate-500" />
                        카테고리 트리
                    </h2>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-0.5">
                        {/* All Categories Option */}
                        <div 
                            className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all mb-2 ${
                                selectedCategory === null 
                                    ? 'bg-pink-50 text-pink-600 font-bold border-l-4 border-pink-500' 
                                    : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            <Globe className={`w-4 h-4 ${selectedCategory === null ? 'text-pink-500' : 'text-slate-400'}`} />
                            <span className="text-sm font-bold">전체 채널 보기</span>
                        </div>
                        {treeLoading ? (
                            <div className="text-center py-10 text-slate-400 text-sm">불러오는 중...</div>
                        ) : !tree || tree.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">등록된 카테고리가 없습니다.</div>
                        ) : (
                            renderTree(tree)
                        )}
                    </div>
                </div>

                {/* Right Panel: Channel Pool */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-sm">
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-3 mb-1.5">
                                    <h2 className="text-2xl font-black text-slate-900">
                                        {selectedCategory ? selectedCategory.name : "전체 수집 채널 풀"}
                                    </h2>
                                    {selectedCategory?.ai_generated && (
                                        <span className="px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full text-[10px] font-bold border border-pink-200">
                                            AI 생성됨
                                        </span>
                                    )}
                                    {(selectedCategory?.is_fixed || selectedCategory?.level === 0) && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-200">
                                            시스템 대분류
                                        </span>
                                    )}
                                    {!selectedCategory && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200">
                                            통합 뷰
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-4">
                                    <span>
                                        {selectedCategory 
                                            ? `분류 레벨: ${selectedCategory.level === 0 ? '대분류 (Level 0)' : selectedCategory.level === 1 ? '중분류 (Level 1)' : '소분류/니치 (Level 2)'}`
                                            : '모든 니치 카테고리에 할당된 정규 채널 목록입니다.'
                                        }
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-slate-400"/> 
                                        등록 채널: <strong>{channelPool.length}</strong>개
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(selectedChannels.length > 0 || selectedCategory) && (
                                    <button 
                                        onClick={handleBulkDelete}
                                        disabled={bulkDeleteMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all text-xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {selectedChannels.length > 0 ? `선택 삭제 (${selectedChannels.length})` : '카테고리 전체 채널 삭제'}
                                    </button>
                                )}
                                {!selectedCategory && (
                                    <>
                                    <button 
                                        onClick={() => discoverAllMutation.mutate()}
                                        disabled={discoverAllMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all text-xs shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                                    >
                                        {discoverAllMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        전체 채널 탐색
                                    </button>
                                    <button 
                                        onClick={handleReset}
                                        disabled={resetMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded-lg font-bold transition-all text-xs"
                                    >
                                        {resetMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        전체 초기화
                                    </button>
                                    </>
                                )}
                                {selectedCategory && selectedCategory.level < 2 && (
                                    <button 
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 rounded-lg font-bold transition-all text-xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        하위 분류 추가
                                    </button>
                                )}
                                {selectedCategory && selectedCategory.level === 2 && (
                                    <button 
                                        onClick={() => discoverMutation.mutate(selectedCategory.id)}
                                        disabled={discoverMutation.isPending}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg font-bold transition-all text-xs"
                                    >
                                        {discoverMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                        채널 탐색
                                    </button>
                                )}
                                {selectedCategory && !selectedCategory.is_fixed && selectedCategory.level > 0 && (
                                    <button 
                                        onClick={() => handleDeleteCategory(selectedCategory)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-all text-xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        카테고리 삭제
                                    </button>
                                )}
                            </div>
                        </div>


                        <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 flex flex-col">
                            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 text-xs font-bold text-slate-500 bg-slate-100/70 items-center">
                                <div className="col-span-3 flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500"
                                        checked={displayChannels.length > 0 && selectedChannels.length === displayChannels.length}
                                        onChange={toggleAllChannels}
                                    />
                                    <span>채널명</span>
                                </div>
                                <div className="col-span-2">소속 카테고리</div>
                                <div className="col-span-2">구독자</div>
                                <div className="col-span-2">주요 포맷</div>
                                <div className="col-span-1">주기</div>
                                <div className="col-span-2 text-right">평균 조회수</div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {poolLoading ? (
                                    <div className="text-center py-20 text-slate-400 text-sm">데이터를 불러오는 중입니다...</div>
                                ) : displayChannels.length === 0 ? (
                                    <div className="text-center py-20 text-slate-400 text-sm flex flex-col items-center justify-center">
                                        <Globe className="w-10 h-10 mb-2.5 text-slate-300" />
                                        <p>등록된 정규 채널이 없습니다.</p>
                                    </div>
                                ) : (
                                    displayChannels.map((ch: any) => {
                                        const cleanName = getCleanChannelName(ch);
                                        const isSeed = ch.name?.startsWith('Seed UC');
                                        return (
                                            <div key={ch.id} className={`grid grid-cols-12 gap-4 p-4 border-b border-slate-100 items-center hover:bg-slate-100/50 transition-colors text-slate-700 text-sm ${selectedChannels.includes(ch.id) ? 'bg-pink-50/30' : ''}`}>
                                                <div className="col-span-3 flex items-center gap-3">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500 shrink-0"
                                                        checked={selectedChannels.includes(ch.id)}
                                                        onChange={() => toggleChannelSelection(ch.id)}
                                                    />
                                                    {ch.thumbnail_path ? (
                                                        <img src={ch.thumbnail_path} alt="" className="w-8 h-8 rounded-full border border-slate-200 shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">
                                                            {cleanName.substring(0, 1)}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <a href={ch.url} target="_blank" rel="noreferrer" className="font-semibold text-slate-800 hover:text-pink-600 transition-colors truncate flex items-center gap-1.5">
                                                            {cleanName}
                                                        </a>
                                                        {isSeed && (
                                                            <span className="text-[10px] text-amber-500 font-bold bg-amber-50 border border-amber-200 px-1 py-0.5 rounded w-max mt-0.5">
                                                                수집 대기 중
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="col-span-2 text-xs text-slate-500 font-medium truncate">
                                                    {ch.category_name || '미지정'}
                                                </div>
                                                <div className="col-span-2 text-xs text-slate-600 font-semibold">
                                                    {formatSubscriberCount(ch.subscriber_count)}
                                                </div>
                                                <div className="col-span-2 text-xs font-medium">
                                                    {isSeed ? (
                                                        <span className="text-slate-400">-</span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                                                            ch.content_format?.includes('숏폼') 
                                                                ? 'bg-pink-50 text-pink-600 border-pink-200' 
                                                                : ch.content_format?.includes('롱폼') 
                                                                ? 'bg-blue-50 text-blue-600 border-blue-200' 
                                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                                        }`}>
                                                            {ch.content_format || '미정'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="col-span-1 text-xs text-slate-600 font-medium flex items-center gap-1">
                                                    {!isSeed && ch.uploads_per_week > 0 ? (
                                                        <>
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                            {ch.uploads_per_week}회
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </div>
                                                <div className="col-span-2 text-right text-xs text-slate-600 font-semibold">
                                                    {isSeed ? '-' : formatViews(ch.avg_views)}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
                    <div className="w-[450px] bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                            <FolderTree className="w-5 h-5 text-pink-500" />
                            <h3 className="text-lg font-bold text-slate-800">
                                {selectedCategory 
                                    ? `"${selectedCategory.name}" 하위 분류 추가`
                                    : '신규 대분류 카테고리 추가'}
                            </h3>
                        </div>
                        <form onSubmit={handleAddCategory} className="space-y-4">
                            {selectedCategory && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs text-slate-600">
                                    <AlertCircle className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                                    <span>
                                        이 분류는 <strong>{selectedCategory.level === 0 ? '중분류 (Level 1)' : '소분류/니치 (Level 2)'}</strong>로 생성되어 상위 카테고리에 예속됩니다.
                                    </span>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">분류 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder={selectedCategory?.level === 1 ? '예: 해외반응이슈, 국내영화1분요약 등' : '분류명을 입력하세요'}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-pink-500/50 rounded-xl text-slate-800 text-sm outline-none transition-all placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setNewCategoryName('');
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-xs"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={createCategoryMutation.isPending}
                                    className="px-5 py-2 bg-pink-600 hover:bg-pink-500 disabled:bg-pink-300 text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5"
                                >
                                    {createCategoryMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    추가하기
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
