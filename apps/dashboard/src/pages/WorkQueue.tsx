import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { fetchWithRetry, uint8ArrayToBase64 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PixelingImportDialog } from "@/components/PixelingImportDialog";
import {
    Plus, Upload, RefreshCw, Trash2, Edit, CheckCircle, XCircle, Clock,
    AlertTriangle, Shield, Play, FileText, ArrowRight, FolderOpen,
    Eye, EyeOff, Paperclip, Rocket, RotateCcw, FileVideo, Layers, Clock4,
    FileCheck, Hash, Files, Filter, ChevronDown, ChevronUp, Copy, Film,
    Save, FileSpreadsheet, Send, Search, ArrowUpDown, Workflow, Pause,
    PlaySquare, Settings, Table, Columns2, Volume2, VolumeX, X, SlidersHorizontal
} from 'lucide-react';


const getStreamUrl = (filePath: string) => {
    if (!filePath) return '';
    // Electron 데스크톱 앱(file:// 또는 커스텀 프로토콜)에서는 FastAPI 백엔드 주소를 명시해야 net::ERR_FILE_NOT_FOUND 방지
    const isDevHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.port !== '8000';
    const baseUrl = isDevHttp ? '' : 'http://127.0.0.1:8000';
    return `${baseUrl}/api/work-queue/stream?path=${encodeURIComponent(filePath)}`;
};




// -- Instant Cache Helpers for WorkQueue --
const getLocalCache = <T,>(key: string, fallback: T): T => {
    try {
        const saved = localStorage.getItem(`VL_WQ_CACHE_${key}`);
        if (saved) return JSON.parse(saved);
    } catch (_) {}
    return fallback;
};

const setLocalCache = (key: string, data: any) => {
    try {
        localStorage.setItem(`VL_WQ_CACHE_${key}`, JSON.stringify(data));
    } catch (_) {}
};

const WorkQueue = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const hasHandledOpenRef = useRef(false);

    // URL 쿼리 파라미터에서 특정 작업 항목 ID (?item_id=123) 추출
    const targetItemId = searchParams.get('item_id') ? Number(searchParams.get('item_id')) : null;

    useEffect(() => {
        const hasSessionPending = sessionStorage.getItem('pending_pixeling_open') === 'true' || sessionStorage.getItem('pending_pixeling_meta');
        const hasStatePending = (location.state as any)?.openPixeling || searchParams.get('openPixeling') === 'true';
        
        if ((hasSessionPending || hasStatePending) && !hasHandledOpenRef.current) {
            hasHandledOpenRef.current = true;
            sessionStorage.removeItem('pending_pixeling_open');
            setIsPixelingOpen(true);
        }
    }, [location.pathname]);

    const { toast } = useToast();
    const [queueItems, setQueueItems] = useState<any[]>(() => getLocalCache('queueItems', []));
    const [stats, setStats] = useState<any>(() => getLocalCache('stats', {}));
    const [activeTab, setActiveTab] = useState('all');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isPixelingOpen, setIsPixelingOpen] = useState(false);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'batch'; itemId?: number; title?: string; count?: number } | null>(null);
    const [deleteVideoFile, setDeleteVideoFile] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [wsConnections, setWsConnections] = useState<Map<number, WebSocket>>(new Map());
    const [dateFilter, setDateFilter] = useState('all');
    const [limit, setLimit] = useState(100);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('all');
    const [batchGroups, setBatchGroups] = useState<any[]>(() => getLocalCache('batchGroups', []));
    const [channels, setChannels] = useState<any[]>(() => getLocalCache('channels', []));
    const [tiktokChannels, setTiktokChannels] = useState<any[]>(() => getLocalCache('tiktokChannels', []));
    const [instagramChannels, setInstagramChannels] = useState<any[]>(() => getLocalCache('instagramChannels', []));
    // 강화된 검색/정렬 상태
    const [channelFilter, setChannelFilter] = useState('all');
    const [uploadMethodFilter, setUploadMethodFilter] = useState('all');
    const [sortField, setSortField] = useState<'created_at' | 'scheduled_at' | 'channel' | 'status'>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        loadQueueItems();
        loadStats();
        loadAllChannels();
        loadBatchGroups();
        const interval = setInterval(() => { loadQueueItems(); loadStats(); loadBatchGroups(); }, 10000);
        return () => clearInterval(interval);
    }, [activeTab, dateFilter, limit, searchQuery, selectedBatch]);

    const connectWebSocket = (itemId: number) => {
        const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/work-queue/ws/progress/${itemId}`);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setQueueItems(prevItems => prevItems.map(item => item.id === data.queue_item_id ? { ...item, upload_progress: data.progress } : item));
                if (data.progress === 100) toast({ title: "업로드 완료", description: data.message });
            } catch (_) { }
        };
        setWsConnections(prev => new Map(prev).set(itemId, ws));
    };

    const buildUrl = () => {
        const statusFilter = activeTab === 'all' ? null
            : activeTab === 'draft' ? 'DRAFT'
            : activeTab === 'pending' ? 'PENDING'
            : activeTab === 'queued' ? 'QUEUED'
            : activeTab === 'uploading' ? 'UPLOADING'
            : activeTab === 'verifying' ? 'VERIFYING'
            : activeTab === 'completed' ? 'COMPLETED'
            : (activeTab === 'failed_review' || activeTab === 'failed') ? 'FAILED' : null;

        let url = `/api/work-queue/items?limit=${limit}&date_filter=${dateFilter}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (selectedBatch && selectedBatch !== 'all') url += `&source_batch_id=${encodeURIComponent(selectedBatch)}`;
        return url;
    };

    const loadQueueItems = async () => {
        try {
            const response = await fetchWithRetry(buildUrl());
            const data = await response.json();
            const items = Array.isArray(data) ? data : [];
            setQueueItems(items);
            setLocalCache('queueItems', items);
        } catch (_) {}
    };

    const loadBatchGroups = async () => {
        try {
            const response = await fetchWithRetry('/api/work-queue/batches');
            if (response.ok) {
                const data = await response.json();
                setBatchGroups(data);
                setLocalCache('batchGroups', data);
            }
        } catch (_) { }
    };

    const loadStats = async () => {
        try {
            const response = await fetchWithRetry('/api/work-queue/stats');
            const data = await response.json();
            setStats(data);
            setLocalCache('stats', data);
        } catch (_) { }
    };

    const loadAllChannels = async () => {
        try {
            const [r1, r2, r3] = await Promise.all([
                fetchWithRetry('/api/youtube/all'),
                fetchWithRetry('/api/tiktok-channels/'),
                fetchWithRetry('/api/instagram-channels/')
            ]);
            if (r1.ok) { const d1 = await r1.json(); setChannels(d1); setLocalCache('channels', d1); }
            if (r2.ok) { const d2 = await r2.json(); setTiktokChannels(d2); setLocalCache('tiktokChannels', d2); }
            if (r3.ok) { const d3 = await r3.json(); setInstagramChannels(d3); setLocalCache('instagramChannels', d3); }
        } catch (_) { }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            'DRAFT': { className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300', icon: Edit, text: '임시 보관' },
            'PENDING': { className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200', icon: Clock, text: '승인 대기' },
            'QUEUED': { className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200', icon: Clock, text: '대기열' },
            'UPLOADING': { className: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200', icon: Upload, text: '업로드 중' },
            'VERIFYING': { className: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200', icon: Clock4, text: '검증 중' },
            'COMPLETED': { className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200', icon: CheckCircle, text: '완료' },
            'FAILED_REVIEW': { className: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 border-pink-200', icon: Shield, text: '실패 검토' },
        };
        const c = variants[status] || variants['QUEUED'];
        return <Badge variant="outline" className={`flex items-center gap-1 text-[11px] font-medium py-0.5 px-2 ${c.className}`}><c.icon className="w-3 h-3" />{c.text}</Badge>;
    };

    const getApprovalBadge = (approvalStatus: string) => {
        const v: Record<string, any> = {
            'PENDING': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            'APPROVED': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
            'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        };
        return <Badge className={`text-[10px] py-0 px-1.5 ${v[approvalStatus] || ''}`}>{approvalStatus}</Badge>;
    };

    const handleApprove = async (itemId: number) => {
        try {
            await fetchWithRetry('/api/work-queue/batch/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: [itemId], approved_by: 'user' }) });
            toast({ title: "승인됨" });
            loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };

    const handleReject = async (itemId: number, reason: string) => {
        try {
            await fetchWithRetry('/api/work-queue/batch/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: [itemId], reason }) });
            toast({ title: "반려됨" });
            loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };

    const handleDelete = (itemOrId: any) => {
        if (typeof itemOrId === 'object' && itemOrId !== null) {
            setDeleteTarget({ type: 'single', itemId: itemOrId.id, title: itemOrId.title });
        } else {
            const found = queueItems.find(i => i.id === itemOrId);
            setDeleteTarget({ type: 'single', itemId: itemOrId, title: found?.title });
        }
        setDeleteVideoFile(false);
    };

    const handleBatchDelete = () => {
        if (!selectedItems.length) return;
        setDeleteTarget({ type: 'batch', count: selectedItems.length });
        setDeleteVideoFile(false);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === 'single' && deleteTarget.itemId) {
                await fetchWithRetry(`/api/work-queue/items/${deleteTarget.itemId}?delete_video_file=${deleteVideoFile}`, { method: 'DELETE' });
                toast({
                    title: "삭제 완료",
                    description: deleteVideoFile ? "대기열 목록 및 PC의 영상 파일이 모두 삭제되었습니다." : "대기열 목록에서 삭제되었습니다 (영상 원본 파일 보존)."
                });
            } else if (deleteTarget.type === 'batch' && selectedItems.length) {
                await fetchWithRetry('/api/work-queue/batch/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_ids: selectedItems, delete_video_files: deleteVideoFile })
                });
                toast({
                    title: "일괄 삭제 완료",
                    description: deleteVideoFile ? `${selectedItems.length}개 항목 및 영상 파일이 삭제되었습니다.` : `${selectedItems.length}개 항목이 목록에서 삭제되었습니다 (영상 원본 파일 보존).`
                });
                setSelectedItems([]);
            }
            setDeleteTarget(null);
            loadQueueItems();
            loadStats();
        } catch (_) {
            toast({ variant: "destructive", title: "삭제 실패", description: "삭제 처리 중 오류가 발생했습니다." });
        }
    };


    const handleBatchApprove = async () => {
        if (!selectedItems.length) return;
        try {
            await fetchWithRetry('/api/work-queue/batch/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: selectedItems, approved_by: 'user' }) });
            toast({ title: "일괄 승인 완료" });
            setSelectedItems([]); loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };

    const handleBatchReject = async () => {
        if (!selectedItems.length) return;
        const reason = prompt('반려 사유:');
        if (!reason) return;
        try {
            await fetchWithRetry('/api/work-queue/batch/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: selectedItems, reason }) });
            toast({ title: "일괄 반려 완료" });
            setSelectedItems([]); loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };

    const handleReset = async (itemId: number) => {
        try {
            await fetchWithRetry('/api/work-queue/batch/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_ids: [itemId] })
            });
            toast({ title: "재시도 대기열에 등록되었습니다." });
            loadQueueItems();
            loadStats();
        } catch (_) {
            toast({ variant: "destructive", title: "재시도 등록 실패" });
        }
    };

    const handleBatchReset = async () => {
        if (!selectedItems.length) return;
        try {
            await fetchWithRetry('/api/work-queue/batch/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_ids: selectedItems }) });
            toast({ title: "초기화 완료" });
            setSelectedItems([]); loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };


    const handleBatchFinalize = async () => {
        if (!selectedItems.length) return;
        try {
            await fetchWithRetry('/api/work-queue/batch/finalize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: selectedItems.map(id => ({ id })) }) });
            toast({ title: "일괄 등록 완료" });
            setSelectedItems([]); loadQueueItems(); loadStats();
        } catch (_) { toast({ variant: "destructive", title: "오류" }); }
    };

    const [uploadingItemId, setUploadingItemId] = useState<number | null>(null);
    const directFileInputRef = useRef<HTMLInputElement>(null);
    const targetAttachItemIdRef = useRef<number | null>(null);

    const handleAttachVideo = async (itemId: number) => {
        // 웹 브라우저 환경에서는 즉시 파일 선택창을 열어 업로드 진행
        targetAttachItemIdRef.current = itemId;
        directFileInputRef.current?.click();
    };

    const handleDirectFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const itemId = targetAttachItemIdRef.current;
        if (!file || !itemId) return;

        e.target.value = '';
        setUploadingItemId(itemId);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetchWithRetry(`/api/work-queue/items/${itemId}/upload-attach`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                toast({ title: "영상 첨부 완료", description: `서버에 업로드되어 대기열 항목 #${itemId}에 연결되었습니다.` });
                loadQueueItems();
                loadStats();
            } else {
                const err = await res.json();
                throw new Error(err.detail || '업로드 실패');
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "영상 첨부 실패", description: err.message || '서버 오류' });
        } finally {
            setUploadingItemId(null);
            targetAttachItemIdRef.current = null;
        }
    };

    const handleFinalize = async (itemId: number) => {
        const item = queueItems.find(q => q.id === itemId);
        if (!item?.video_file_path) {
            toast({ variant: "destructive", title: "영상 필요", description: "먼저 영상을 첨부해 주세요" });
            return;
        }
        try {
            const res = await fetchWithRetry(`/api/work-queue/items/${itemId}/finalize`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approval_required: false })
            });
            if (res.ok) {
                const d = await res.json();
                toast({ title: "즉시 등록 완료", description: d.upload_queued ? "대기열 등록 완료" : "승인 대기 등록" });
                loadQueueItems();
                loadStats();
            } else throw await res.json();
        } catch (e: any) {
            toast({ variant: "destructive", title: "등록 실패", description: e?.detail || '서버 오류' });
        }
    };


    const handleUpdateItem = async (itemId: number, updates: any) => {
        try {
            await fetchWithRetry(`/api/work-queue/items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
            loadQueueItems();
        } catch (_) { }
    };

    const handleUpdateUploadMethod = (itemId: number, method: string) => handleUpdateItem(itemId, { upload_method: method });

    const handleUpdateChannel = (itemId: number, platform: string, value: string) => {
        const item = queueItems.find(q => q.id === itemId);
        if (!item) return;
        const currentConfigs = item.platform_configs || {};
        const key = platform === 'youtube' ? 'channel_id' : 'account_id';
        handleUpdateItem(itemId, { platform_configs: { ...currentConfigs, [platform]: { ...(currentConfigs[platform] || {}), [key]: value } } });
    };

    const toggleItemSelection = (id: number) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAllSelection = () => setSelectedItems(selectedItems.length === queueItems.length ? [] : queueItems.map(i => i.id));
    const clearFilters = () => { setSearchQuery(''); setSelectedBatch('all'); setDateFilter('all'); setChannelFilter('all'); setUploadMethodFilter('all'); setSortField('created_at'); setSortDir('desc'); };

    // 강화된 다차원 검색 & 필터링 & 정렬 연산
    const filteredAndSortedItems = React.useMemo(() => {
        let list = [...queueItems];

        // 1. 실시간 다중 키워드 검색 (제목, 설명, 파일명, ID, 프로젝트 그룹, 채널명)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(item => {
                const matchId = String(item.id).includes(q);
                const matchTitle = item.title?.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q);
                const matchFile = item.video_file_path?.toLowerCase().includes(q);
                const matchBatch = item.source_batch_id?.toLowerCase().includes(q);
                const ytChan = channels.find(c => String(c.id) === String(item.platform_configs?.youtube?.channel_id))?.name?.toLowerCase() || '';
                const matchChannel = (item.channel_name || item.account_name || ytChan).includes(q);
                return matchId || matchTitle || matchDesc || matchFile || matchBatch || matchChannel;
            });
        }

        // 2. 채널 계정 필터
        if (channelFilter !== 'all') {
            list = list.filter(item => {
                const ytId = String(item.platform_configs?.youtube?.channel_id || '');
                const ttId = String(item.platform_configs?.tiktok?.account_id || '');
                const igId = String(item.platform_configs?.instagram?.account_id || '');
                const currentChan = String(item.channel_id || item.account_id || '');
                return ytId === channelFilter || ttId === channelFilter || igId === channelFilter || currentChan === channelFilter;
            });
        }

        // 3. 업로드 방식 필터
        if (uploadMethodFilter !== 'all') {
            list = list.filter(item => {
                const method = item.upload_method || 'stealth_auto';
                if (uploadMethodFilter === 'manual') return method === 'manual';
                if (uploadMethodFilter === 'stealth_auto') return method === 'stealth_auto';
                if (uploadMethodFilter === 'api') return method === 'api';
                if (uploadMethodFilter === 'immediate') return item.is_immediate || method === 'immediate';
                return true;
            });
        }

        // 4. 정렬 로직
        list.sort((a, b) => {
            let comp = 0;
            if (sortField === 'created_at') {
                const da = new Date(a.created_at || 0).getTime();
                const db = new Date(b.created_at || 0).getTime();
                comp = da - db;
            } else if (sortField === 'scheduled_at') {
                const da = new Date(a.scheduled_time || a.scheduled_at || a.created_at || 0).getTime();
                const db = new Date(b.scheduled_time || b.scheduled_at || b.created_at || 0).getTime();
                comp = da - db;
            } else if (sortField === 'channel') {
                const ca = a.channel_name || a.account_name || '';
                const cb = b.channel_name || b.account_name || '';
                comp = ca.localeCompare(cb);
            } else if (sortField === 'status') {
                const sa = a.status || '';
                const sb = b.status || '';
                comp = sa.localeCompare(sb);
            }
            return sortDir === 'asc' ? comp : -comp;
        });

        return list;
    }, [queueItems, searchQuery, channelFilter, uploadMethodFilter, sortField, sortDir, channels]);



    const totalCount = (stats.total ?? 0);
    const draftCount = (stats.draft ?? 0);
    const pendingCount = (stats.pending ?? 0);
    const queuedCount = (stats.queued ?? 0);
    const uploadingCount = (stats.uploading ?? 0);
    const completedCount = (stats.completed ?? 0);
    const failedCount = (stats.failed ?? 0) + (stats.failed_review ?? 0);

    return (
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 w-full min-h-screen pb-36 md:pb-8">

            {/* 1. 상단 타이틀 및 액션 버튼 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Layers className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        쇼츠 자동 배포 관리
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        다중 플랫폼(YouTube / TikTok / Instagram) 원클릭 및 스텔스 브라우저 업로드 오케스트레이션
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <Button onClick={() => setIsPixelingOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex-1 sm:flex-initial">
                        <Layers className="w-3.5 h-3.5 mr-1.5" /> 픽셀링 제작물 등록
                    </Button>
                    <Button onClick={() => { setEditingItem(null); setIsAddDialogOpen(true); }} variant="outline" className="text-xs border-border font-medium flex-1 sm:flex-initial">
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> 개별 영상 등록
                    </Button>
                    <Button onClick={() => setShowBulkImport(true)} variant="outline" className="text-xs border-border font-medium flex-1 sm:flex-initial">
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> 엑셀 일괄 등록
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { loadQueueItems(); loadStats(); loadBatchGroups(); }} className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0" title="새로고침">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 2. 대기열 상태 통계 요약 카드 (7개 상태 완벽 동기화) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 w-full">
                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => setActiveTab('all')}>
                    <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">전체</p>
                            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground mt-0.5">{totalCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setActiveTab('draft')}>
                    <CardContent className="p-3 sm:p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">임시 보관</p>
                            <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground mt-0.5">{draftCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                            <Edit className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-amber-400 transition-colors" onClick={() => setActiveTab('pending')}>
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">승인 대기</p>
                            <h3 className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                            <Clock className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setActiveTab('queued')}>
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">대기열</p>
                            <h3 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 mt-0.5">{queuedCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            <Rocket className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-violet-400 transition-colors" onClick={() => setActiveTab('uploading')}>
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">업로드 중</p>
                            <h3 className="text-xl font-bold tracking-tight text-violet-600 dark:text-violet-400 mt-0.5">{uploadingCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                            <Upload className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => setActiveTab('completed')}>
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">완료</p>
                            <h3 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">{completedCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-2xs cursor-pointer hover:border-red-400 transition-colors" onClick={() => setActiveTab('failed_review')}>
                    <CardContent className="p-3.5 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground">실패</p>
                            <h3 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-0.5">{failedCount}</h3>
                        </div>
                        <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. 일괄 작업 액션 바 */}
            {selectedItems.length > 0 && (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg flex items-center justify-between flex-wrap gap-2 w-full animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-indigo-600 text-white text-xs">{selectedItems.length}개 항목 선택됨</Badge>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])} className="h-7 text-xs text-muted-foreground hover:text-foreground">선택 해제</Button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button size="sm" onClick={handleBatchApprove} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" /> 일괄 승인
                        </Button>
                        <Button size="sm" onClick={handleBatchFinalize} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                            <Rocket className="w-3 h-3 mr-1" /> 일괄 대기열 등록
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleBatchDelete} className="h-7 text-xs font-medium">
                            <Trash2 className="w-3 h-3 mr-1" /> 일괄 삭제
                        </Button>
                    </div>
                </div>
            )}

            <VideoPlayerDialog isOpen={isPlayerOpen} setIsOpen={setIsPlayerOpen} item={playingItem} />
            <AddVideoDialog isOpen={isAddDialogOpen} setIsOpen={setIsAddDialogOpen} onSuccess={() => { loadQueueItems(); loadStats(); setIsAddDialogOpen(false); }} initialData={editingItem} />
            <BulkImportDialog isOpen={showBulkImport} setIsOpen={setShowBulkImport} onSuccess={() => { loadQueueItems(); loadStats(); }} />
            {isPixelingOpen && (
                <PixelingImportDialog isOpen={isPixelingOpen} setIsOpen={setIsPixelingOpen} onSuccess={() => { loadQueueItems(); loadStats(); }} />
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent className="max-w-md bg-card border-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-base">
                            <Trash2 className="w-5 h-5" />
                            {deleteTarget?.type === 'batch' ? `선택 항목 일괄 삭제 (${deleteTarget.count}개)` : '대기열 항목 삭제'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs pt-1">
                            {deleteTarget?.type === 'batch'
                                ? `선택한 ${deleteTarget.count}개의 작업 대기열 항목을 삭제하시겠습니까?`
                                : `"${deleteTarget?.title || '선택한 항목'}" 대기열을 삭제하시겠습니까?`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="bg-muted/50 p-3 rounded-xl border border-border space-y-2">
                            <div className="flex items-start space-x-2.5">
                                <Checkbox
                                    id="delete-video-file"
                                    checked={deleteVideoFile}
                                    onCheckedChange={(checked) => setDeleteVideoFile(!!checked)}
                                    className="mt-0.5"
                                />
                                <div className="grid gap-1 leading-none">
                                    <label
                                        htmlFor="delete-video-file"
                                        className="text-xs font-semibold text-foreground cursor-pointer"
                                    >
                                        PC에 저장된 실제 영상 파일(.mp4)도 함께 영구 삭제
                                    </label>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {deleteVideoFile
                                            ? "⚠️ 주의: 디스크의 원본 영상 및 썸네일 파일이 완전히 삭제됩니다."
                                            : "💡 체크 해제 시: 대기열 목록만 제거되며, PC의 원본 영상 파일은 안전하게 보존됩니다."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(null)}
                            className="h-8 text-xs border-border bg-card hover:bg-muted text-foreground"
                        >
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={confirmDelete}
                            className="h-8 text-xs font-bold gap-1.5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleteVideoFile ? "파일 포함 완전 삭제" : "목록에서 삭제"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>


            {/* 5. 탭 및 스마트 필터 툴바 */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 w-full">
                    <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        <TabsList className="bg-muted border border-border flex flex-nowrap sm:flex-wrap h-auto p-1 gap-1 min-w-max">
                            <TabsTrigger value="all" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">전체 ({totalCount})</TabsTrigger>
                            <TabsTrigger value="draft" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">임시 보관 ({draftCount})</TabsTrigger>
                            <TabsTrigger value="pending" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">승인 대기 ({pendingCount})</TabsTrigger>
                            <TabsTrigger value="queued" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">대기열 ({queuedCount})</TabsTrigger>
                            <TabsTrigger value="uploading" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">업로드 중 ({uploadingCount})</TabsTrigger>
                            <TabsTrigger value="completed" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">완료 ({completedCount})</TabsTrigger>
                            <TabsTrigger value="failed_review" className="text-xs px-2.5 sm:px-3 py-1.5 font-medium whitespace-nowrap">실패 ({failedCount})</TabsTrigger>
                        </TabsList>
                    </div>
                    
                    {/* 스마트 통합 검색 및 강화된 다차원 필터/정렬 툴바 */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                        {/* 1. 검색어 입력창 + 빠른 X 지우기 버튼 */}
                        <div className="flex items-center gap-1.5 relative w-full sm:w-56 md:w-64 shrink-0">
                            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
                            <Input 
                                placeholder="제목, 채널, 파일명, ID..." 
                                value={searchQuery} 
                                onChange={e => setSearchQuery(e.target.value)} 
                                className="w-full h-8 text-xs bg-background border-border pl-8 pr-7 rounded-lg" 
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
                                    title="검색어 지우기"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* 2. 세부 필터 & 정렬 컨트롤 (모바일 가로 스크롤 / PC 인라인) */}
                        <div className="flex items-center gap-1.5 overflow-x-auto dashboard-scroll-area pb-1 sm:pb-0 shrink-0">
                            {/* 채널 계정 필터 */}
                            <Select value={channelFilter} onValueChange={setChannelFilter}>
                                <SelectTrigger className="h-8 text-xs bg-background shrink-0 w-auto min-w-[96px] whitespace-nowrap px-2.5">
                                    <SelectValue placeholder="전체 채널" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 채널</SelectItem>
                                    {channels.map((c: any) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            🎬 {c.name}
                                        </SelectItem>
                                    ))}
                                    {tiktokChannels.map((c: any) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            🎵 {c.name || c.username}
                                        </SelectItem>
                                    ))}
                                    {instagramChannels.map((c: any) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            📸 {c.name || c.username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 업로드 방식 필터 */}
                            <Select value={uploadMethodFilter} onValueChange={setUploadMethodFilter}>
                                <SelectTrigger className="h-8 text-xs bg-background shrink-0 w-auto min-w-[94px] whitespace-nowrap px-2.5">
                                    <SelectValue placeholder="전체 방식" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 방식</SelectItem>
                                    <SelectItem value="stealth_auto">🤖 스텔스 자동</SelectItem>
                                    <SelectItem value="manual">✍️ 수동 업로드</SelectItem>
                                    <SelectItem value="immediate">⚡ 즉시 등록</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* 프로젝트 그룹 필터 */}
                            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                                <SelectTrigger className="h-8 text-xs bg-background shrink-0 w-auto min-w-[104px] whitespace-nowrap px-2.5">
                                    <SelectValue placeholder="전체 프로젝트" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 프로젝트</SelectItem>
                                    {batchGroups.map((b: any) => (
                                        <SelectItem key={b.batch_id} value={b.batch_id}>
                                            {b.source_type === 'PIXELING' ? '🎨 픽셀링' : b.source_type === 'EXCEL' ? '📊 엑셀' : '📁'}: {b.batch_id} ({b.count}건)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 기간 필터 */}
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="h-8 text-xs bg-background shrink-0 w-auto min-w-[88px] whitespace-nowrap px-2.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="today">오늘</SelectItem>
                                    <SelectItem value="week">최근 7일</SelectItem>
                                    <SelectItem value="month">최근 30일</SelectItem>
                                    <SelectItem value="all">전체 기간</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* 정렬 기준 및 오름/내림차순 토글 */}
                            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 shrink-0">
                                <Select value={sortField} onValueChange={(val: any) => setSortField(val)}>
                                    <SelectTrigger className="h-7 text-xs bg-background border-0 shadow-none shrink-0 w-auto min-w-[90px] whitespace-nowrap px-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="created_at">📅 등록순</SelectItem>
                                        <SelectItem value="scheduled_at">⏰ 예약순</SelectItem>
                                        <SelectItem value="channel">📺 채널순</SelectItem>
                                        <SelectItem value="status">🏷️ 상태순</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    title={sortDir === 'desc' ? '내림차순 (최신순)' : '오름차순 (과거순)'}
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* 필터 초기화 버튼 */}
                            {(searchQuery || selectedBatch !== 'all' || dateFilter !== 'all' || channelFilter !== 'all' || uploadMethodFilter !== 'all' || sortField !== 'created_at' || sortDir !== 'desc') && (
                                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap">
                                    <Filter className="w-3 h-3 mr-1" /> 초기화
                                </Button>
                            )}
                        </div>
                    </div>

                </div>

                {/* 6. 고밀도 대기열 리스트 뷰 */}
                <TabsContent value={activeTab} className="mt-3 w-full">
                    {filteredAndSortedItems.length === 0 ? (
                        <Card className="border-dashed border-2 border-border w-full">
                            <CardContent className="p-14 text-center">
                                <FileVideo className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                <h3 className="text-base font-semibold text-muted-foreground mb-0.5">
                                    {queueItems.length > 0 ? "검색/필터 조건에 맞는 항목이 없습니다" : "대기열에 항목이 없습니다"}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {queueItems.length > 0 ? "검색어나 필터 조건을 재설정해 보세요" : "상단의 [픽셀링 제작물 등록] 또는 [개별 영상 등록]으로 영상을 추가해 보세요"}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 w-full">
                            {filteredAndSortedItems.map((item, idx) => (
                                <QueueItemCompactCard
                                    key={item.id}
                                    index={idx + 1}
                                    item={item}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onDelete={handleDelete}
                                    onReset={handleReset}
                                    onEdit={(i: any) => { setEditingItem(i); setIsAddDialogOpen(true); }}
                                    onPlay={(i: any) => { setPlayingItem(i); setIsPlayerOpen(true); }}
                                    onAttach={handleAttachVideo}

                                    onFinalize={handleFinalize}
                                    onUpdateUploadMethod={handleUpdateUploadMethod}
                                    onUpdateChannel={handleUpdateChannel}
                                    channels={channels}
                                    tiktokChannels={tiktokChannels}
                                    instagramChannels={instagramChannels}
                                    getStatusBadge={getStatusBadge}
                                    getApprovalBadge={getApprovalBadge}
                                    selectedItems={selectedItems}
                                    toggleItemSelection={toggleItemSelection}
                                    isUploadingAttach={uploadingItemId === item.id}
                                    targetItemId={targetItemId}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            <input ref={directFileInputRef} type="file" accept="video/*" className="hidden" onChange={handleDirectFileSelected} />
        </div>
    );
};

// === 사용자 친화적 실패 사유 파서 & 카드 컴포넌트 ===
interface ParsedFailureInfo {
    platform?: string;
    title: string;
    description: string;
    actionGuide: string;
    rawMessage: string;
}

const parseFailureReason = (rawReason: string): ParsedFailureInfo => {
    if (!rawReason) {
        return {
            title: "업로드 실패",
            description: "알 수 없는 오류가 발생했습니다.",
            actionGuide: "[즉시 재시도]를 눌러 다시 실행해 보세요.",
            rawMessage: rawReason
        };
    }

    let platform = '';
    let innerMessage = rawReason;

    try {
        const parsedObj = JSON.parse(rawReason);
        if (typeof parsedObj === 'object' && parsedObj !== null) {
            const keys = Object.keys(parsedObj);
            if (keys.length > 0) {
                platform = keys[0];
                const detail = parsedObj[platform];
                if (typeof detail === 'object' && detail !== null) {
                    innerMessage = detail.message || detail.error || JSON.stringify(detail);
                } else if (typeof detail === 'string') {
                    innerMessage = detail;
                }
            }
        }
    } catch (_) { }

    const platformName = platform === 'youtube' ? '유튜브(YouTube)'
        : platform === 'tiktok' ? '틱톡(TikTok)'
        : platform === 'instagram' ? '인스타그램(Instagram)'
        : platform ? platform.toUpperCase() : '';

    const lower = (innerMessage || '').toLowerCase();

    if (lower.includes('indentation') || lower.includes('browser_session') || lower.includes('syntaxerror') || lower.includes('internal error')) {
        return {
            platform: platformName,
            title: `${platformName ? platformName + ' ' : ''}브라우저 자동화 엔진 오류`,
            description: "업로드 자동화 브라우저 실행 중 일시적인 시스템/엔진 오류가 발생했습니다.",
            actionGuide: "[즉시 재시도]를 누르거나 잠시 후 다시 시도해 주세요.",
            rawMessage: rawReason
        };
    }

    if (lower.includes('login') || lower.includes('auth') || lower.includes('cookie') || lower.includes('session') || lower.includes('unauthorized') || lower.includes('401')) {
        return {
            platform: platformName,
            title: `${platformName ? platformName + ' ' : ''}채널 로그인 세션 만료`,
            description: "채널의 로그인 세션 또는 인증 쿠키가 만료되어 업로드가 중단되었습니다.",
            actionGuide: "설정 > 브라우저 프로필 관리에서 해당 채널의 로그인을 확인/갱신해 주세요.",
            rawMessage: rawReason
        };
    }

    if (lower.includes('quota') || lower.includes('limit') || lower.includes('exceeded') || lower.includes('한도') || lower.includes('제한')) {
        return {
            platform: platformName,
            title: `${platformName ? platformName + ' ' : ''}일일 업로드 한도 도달`,
            description: "해당 채널의 플랫폼 일일 영상 업로드 가능 한도에 도달했습니다.",
            actionGuide: "플랫폼 정책상 24시간 후 업로드가 재개되거나 내일 다시 시도해 주세요.",
            rawMessage: rawReason
        };
    }

    if (lower.includes('file not found') || lower.includes('no such file') || lower.includes('cannot find') || lower.includes('corrupt')) {
        return {
            platform: platformName,
            title: "영상 파일 경로 오류",
            description: "지정된 영상 파일을 찾을 수 없거나 파일이 손상되었습니다.",
            actionGuide: "영상 파일 경로를 확인하거나 영상을 다시 첨부해 주세요.",
            rawMessage: rawReason
        };
    }

    if (lower.includes('timeout') || lower.includes('network') || lower.includes('connect') || lower.includes('econnrefused')) {
        return {
            platform: platformName,
            title: "네트워크 연결 시간 초과",
            description: "업로드 서버 또는 플랫폼과의 통신이 지연되어 시간 초과가 발생했습니다.",
            actionGuide: "인터넷 연결 상태를 확인한 후 [즉시 재시도]를 눌러주세요.",
            rawMessage: rawReason
        };
    }

    return {
        platform: platformName,
        title: `${platformName ? platformName + ' ' : ''}업로드 처리 실패`,
        description: innerMessage && innerMessage.length < 120 ? innerMessage : "업로드 처리 중 오류가 발생했습니다.",
        actionGuide: "[즉시 재시도] 버튼을 눌러 다시 시도해 주세요.",
        rawMessage: rawReason
    };
};

const FailureReasonCard = ({ failureReason, onRetry }: { failureReason: string; onRetry?: () => void }) => {
    const [showRaw, setShowRaw] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const info = parseFailureReason(failureReason);

    const handleRetryClick = async () => {
        if (!onRetry) return;
        setIsRetrying(true);
        try {
            await onRetry();
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <div className="p-3 bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs space-y-2 animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{info.title}</span>
                </div>
                {onRetry && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetryClick}
                        disabled={isRetrying}
                        className="h-6 px-2 text-[11px] font-bold border-red-300 dark:border-red-800 bg-white dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 gap-1 shrink-0"
                    >
                        <RotateCcw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                        {isRetrying ? '재시도 중...' : '즉시 재시도'}
                    </Button>
                )}
            </div>

            <p className="text-red-700 dark:text-red-300 text-[11px] leading-relaxed">
                {info.description}
            </p>

            {info.actionGuide && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-300/90 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 px-2.5 py-1.5 rounded-lg leading-normal">
                    <span className="font-bold shrink-0">💡 해결 가이드:</span>
                    <span>{info.actionGuide}</span>
                </div>
            )}

            <div className="pt-0.5">
                <button
                    type="button"
                    onClick={() => setShowRaw(!showRaw)}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors underline cursor-pointer"
                >
                    <span>{showRaw ? '▾ 기술 상세 로그 닫기' : '▸ 기술 상세 로그 보기 (개발자용)'}</span>
                </button>
                {showRaw && (
                    <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
                        {info.rawMessage}
                    </pre>
                )}
            </div>
        </div>
    );
};

const QueueItemCompactCard = ({
    index, item, onApprove, onReject, onDelete, onReset, onEdit, onPlay,
    onAttach, onFinalize, onUpdateUploadMethod, onUpdateChannel,
    channels, tiktokChannels, instagramChannels,
    getStatusBadge, getApprovalBadge, selectedItems, toggleItemSelection,
    isUploadingAttach, targetItemId
}: any) => {

    const { toast } = useToast();
    const isTarget = targetItemId && item.id === targetItemId;
    const [expanded, setExpanded] = useState(isTarget || false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [videoInfo, setVideoInfo] = useState<{ width: number; height: number; duration: number; isVertical: boolean } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const hasVideo = !!item.video_file_path;

    // 실패 사유 원시 텍스트 통합 (failure_reason, error_message, error, last_error 모두 지원)
    const rawFailureReason = item.failure_reason || item.error_message || item.error || item.last_error || '';
    const isFailed = (item.status || '').toUpperCase() === 'FAILED' || (item.status || '').toUpperCase() === 'FAILED_REVIEW' || !!rawFailureReason;

    // 타겟 아이템으로 진입 시 자동 스크롤 및 자동 펼침
    useEffect(() => {
        if (isTarget) {
            setExpanded(true);
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isTarget]);

    const copyText = (t: string, msg: string) => {
        if (!t) return;
        navigator.clipboard.writeText(t);
        toast({ title: "복사됨", description: msg });
    };

    const handleOpenInSystem = async (path: string) => {
        if ((window as any).electronAPI?.openPath && path) {
            await (window as any).electronAPI.openPath(path);
            toast({ title: "외부 플레이어 실행", description: "시스템 기본 플레이어로 열었습니다." });
        } else {
            toast({ variant: "destructive", title: "실행 불가", description: "Electron 환경에서 지원됩니다." });
        }
    };

    const togglePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const getPlatformSummary = () => {
        const plats = item.target_platforms || [];
        if (!plats.length) return <span className="text-muted-foreground">플랫폼 미지정</span>;
        const configs = item.platform_configs || {};

        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {plats.includes('youtube') && (
                    <span className="inline-flex items-center text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                        🎬 YT: {channels.find((c: any) => c.channel_id === configs.youtube?.channel_id)?.channel_name || configs.youtube?.channel_id || '채널 미선택'}
                    </span>
                )}
                {plats.includes('tiktok') && (
                    <span className="inline-flex items-center text-[10px] font-medium bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200 dark:border-pink-800 rounded px-1.5 py-0.5">
                        🎵 TT: {tiktokChannels.find((c: any) => c.id === configs.tiktok?.account_id)?.nickname || configs.tiktok?.account_id || '계정 미선택'}
                    </span>
                )}
                {plats.includes('instagram') && (
                    <span className="inline-flex items-center text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded px-1.5 py-0.5">
                        📸 IG: {instagramChannels.find((c: any) => c.id === configs.instagram?.account_id)?.nickname || configs.instagram?.account_id || '계정 미선택'}
                    </span>
                )}
            </div>
        );
    };

    const streamUrl = getStreamUrl(item.video_file_path);

    const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const v = e.currentTarget;
        const isVert = v.videoHeight >= v.videoWidth;
        setVideoInfo({
            width: v.videoWidth,
            height: v.videoHeight,
            duration: v.duration,
            isVertical: isVert
        });
    };

    const formatDuration = (sec: number) => {
        if (!sec || isNaN(sec)) return '';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Card 
            ref={cardRef} 
            className={`w-full overflow-hidden border transition-all ${
                isTarget 
                    ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30 shadow-md' 
                    : selectedItems.includes(item.id) 
                        ? 'border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/20 shadow-xs' 
                        : isFailed 
                            ? 'border-rose-300/80 dark:border-rose-900/60 bg-rose-50/10 dark:bg-rose-950/10' 
                            : 'border-border/80 bg-card hover:border-border'
            }`}
        >
            <CardContent className="p-3 w-full min-w-0 space-y-2">
                {/* 1. 모바일 상단 바 (체크박스, 순번, 상태 배지 & 간편 조작 아이콘) */}
                <div className="flex items-center justify-between w-full sm:hidden border-b border-border/40 pb-1.5">
                    <div className="flex items-center gap-2">
                        <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => toggleItemSelection(item.id)} className="border-border" />
                        <span className="text-[11px] font-mono text-muted-foreground">{index}</span>
                        <div className="flex items-center gap-1">
                            {getStatusBadge(item.status)}
                            {item.approval_status && item.approval_status !== 'AUTO_APPROVED' && (
                                <div className="text-[10px]">{getApprovalBadge(item.approval_status)}</div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} className={`h-7 w-7 ${expanded ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-muted-foreground'}`} title="자세히 보기">
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onEdit(item)} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="수정">
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* 2. 본문 컨텐츠 행 (썸네일 + 제목/배지/플랫폼 정보 + 데스크톱 버튼) */}
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
                    {/* 데스크톱 전용 체크박스 & 순번 & 상태 배지 */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={() => toggleItemSelection(item.id)} className="border-border" />
                        <span className="text-[11px] font-mono text-muted-foreground w-5 text-right">{index}</span>
                    </div>

                    <div className="hidden sm:flex flex-col gap-1 shrink-0 w-24">
                        {getStatusBadge(item.status)}
                        {item.approval_status && item.approval_status !== 'AUTO_APPROVED' && (
                            <div className="text-[10px]">{getApprovalBadge(item.approval_status)}</div>
                        )}
                    </div>

                    {/* 미니 썸네일 / 비디오 미리보기 박스 */}
                    <div 
                        onClick={() => setExpanded(!expanded)}
                        className="w-12 h-12 rounded-lg bg-muted/80 border border-border shrink-0 overflow-hidden flex items-center justify-center cursor-pointer relative group hover:border-indigo-500 shadow-2xs"
                        title={hasVideo ? "클릭하여 영상 미리보기 및 상세 확인" : "영상 미첨부"}
                    >
                        {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : hasVideo ? (
                            <>
                                <video 
                                    src={streamUrl} 
                                    muted 
                                    preload="metadata" 
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                    <Play className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                                </div>
                            </>
                        ) : (
                            <FileVideo className="w-4 h-4 text-muted-foreground" />
                        )}
                    </div>

                    {/* 제목, 외부 ID, 플랫폼 채널 정보 */}
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate cursor-pointer hover:text-indigo-600 max-w-full sm:max-w-md" onClick={() => setExpanded(!expanded)}>
                                {item.title || '(제목 없음)'}
                            </h4>
                            {item.source_type === 'PIXELING' ? (
                                <Badge variant="outline" className="text-[10px] font-medium py-0 bg-pink-50/60 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800 shrink-0">
                                    🎨 픽셀링
                                </Badge>
                            ) : item.source_type === 'EXCEL' ? (
                                <Badge variant="outline" className="text-[10px] font-medium py-0 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shrink-0">
                                    📊 엑셀
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] font-medium py-0 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 shrink-0">
                                    ✏️ 수동
                                </Badge>
                            )}
                            {item.source_batch_id && (
                                <Badge variant="outline" className="text-[9px] font-mono py-0 bg-muted/60 text-muted-foreground border-border truncate max-w-28 sm:max-w-32 shrink-0" title={`프로젝트 그룹: ${item.source_batch_id}`}>
                                    📁 {item.source_batch_id}
                                </Badge>
                            )}
                        </div>

                        {/* 플랫폼 요약 & 예약 일시 & 파일 연결 상태 */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs min-w-0">
                            {getPlatformSummary()}
                            <span className="text-muted-foreground/60 hidden sm:inline">·</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                                <Clock4 className="w-3 h-3 text-indigo-500" />
                                {item.scheduled_upload_time ? new Date(item.scheduled_upload_time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '즉시 등록'}
                            </span>
                            <span className="text-muted-foreground/60 hidden sm:inline">·</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {item.upload_method === 'BROWSER_AUTO' ? '스텔스 자동' : item.upload_method === 'API' ? 'API' : '수동'}
                            </span>
                            <span className="text-muted-foreground/60 hidden sm:inline">·</span>
                            {hasVideo ? (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 cursor-pointer hover:underline shrink-0" onClick={() => setExpanded(!expanded)}>
                                    <Play className="w-3 h-3" /> 영상 연결됨
                                </span>
                            ) : (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                                    <FileVideo className="w-3 h-3" /> 영상 미첨부
                                </span>
                            )}
                        </div>

                        {/* 🚨 실패 항목 즉시 가시화 배너 (접힌 상태에서도 실패 사유 바로 노출) */}
                        {isFailed && (
                            <div 
                                onClick={() => setExpanded(!expanded)}
                                className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-medium bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 px-2 py-1 rounded-lg mt-1 cursor-pointer hover:bg-rose-100/80 transition-colors"
                                title="클릭하여 상세 실패 원인 및 해결 가이드 확인"
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                    {parseFailureReason(rawFailureReason).title}:
                                </span>
                                <span className="truncate flex-1">
                                    {parseFailureReason(rawFailureReason).description}
                                </span>
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold underline ml-1 shrink-0">
                                    {expanded ? '상세 닫기 ▴' : '상세 사유 보기 ▾'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 데스크톱 전용 우측 액션 버튼 바 */}
                    <div className="hidden sm:flex items-center gap-1 shrink-0 ml-auto">
                        {(item.status === 'DRAFT' || !item.video_file_path) && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => onAttach(item.id)} disabled={isUploadingAttach} className="h-7 text-xs px-2 border-border">
                                    {isUploadingAttach ? <Loader2 className="w-3 h-3 mr-1 animate-spin text-primary" /> : <Paperclip className="w-3 h-3 mr-1" />}
                                    {isUploadingAttach ? '업로드 중...' : '영상 첨부'}
                                </Button>
                                <Button size="sm" onClick={() => onFinalize(item.id)} className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                                    <Rocket className="w-3 h-3 mr-1" /> 즉시 등록
                                </Button>
                            </>
                        )}
                        {item.approval_status === 'PENDING' && item.video_file_path && (
                            <>
                                <Button size="sm" onClick={() => onApprove(item.id)} className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                                    <CheckCircle className="w-3 h-3 mr-1" /> 승인
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => onReject(item.id, '품질 문제')} className="h-7 text-xs px-2">
                                    <XCircle className="w-3 h-3 mr-1" /> 반려
                                </Button>
                            </>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => setExpanded(!expanded)} className={`h-7 w-7 ${expanded ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' : 'text-muted-foreground'}`} title="자세히 보기">
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onEdit(item)} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="수정">
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* 3. 모바일 전용 하단 주요 액션 버튼 바 */}
                <div className="sm:hidden flex items-center gap-1.5 w-full pt-1.5 border-t border-border/40 justify-end">
                    {(item.status === 'DRAFT' || !item.video_file_path) && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => onAttach(item.id)} disabled={isUploadingAttach} className="h-7 text-xs px-2.5 border-border flex-1">
                                {isUploadingAttach ? <Loader2 className="w-3 h-3 mr-1 animate-spin text-primary" /> : <Paperclip className="w-3 h-3 mr-1" />}
                                {isUploadingAttach ? '업로드 중...' : '영상 첨부'}
                            </Button>
                            <Button size="sm" onClick={() => onFinalize(item.id)} className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex-1">
                                <Rocket className="w-3 h-3 mr-1" /> 즉시 등록
                            </Button>
                        </>
                    )}
                    {item.approval_status === 'PENDING' && item.video_file_path && (
                        <>
                            <Button size="sm" onClick={() => onApprove(item.id)} className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex-1">
                                <CheckCircle className="w-3 h-3 mr-1" /> 승인
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onReject(item.id, '품질 문제')} className="h-7 text-xs px-2 flex-1">
                                <XCircle className="w-3 h-3 mr-1" /> 반려
                            </Button>
                        </>
                    )}
                </div>

                {/* 4. 자세히 보기 펼침 패널 (좌: 9:16 모바일 폰 숏폼 뷰어 / 우: 메타 60% + 배포 40% 최적 레이아웃) */}
                {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/80 space-y-3 w-full min-w-0">
                        <div className="flex flex-col md:flex-row items-stretch gap-4 text-xs w-full min-w-0">
                            
                            {/* [좌측] 📱 9:16 모바일 폰 숏폼 프리뷰어 (고정 폭 170px) */}
                            <div className="w-full md:w-[170px] shrink-0 flex flex-col items-center justify-between p-2.5 rounded-xl border border-border bg-muted/30 space-y-2 shadow-xs">
                                <div className="w-full flex items-center justify-between text-[11px] font-bold text-foreground">
                                    <span className="flex items-center gap-1">
                                        <Play className="w-3 h-3 text-indigo-500" /> 숏폼 뷰
                                    </span>
                                    {hasVideo && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-4 text-[9px] px-1 text-indigo-600 hover:text-indigo-700" 
                                            onClick={() => handleOpenInSystem(item.video_file_path)}
                                            title="시스템 기본 플레이어로 열기"
                                        >
                                            열기 ↗
                                        </Button>
                                    )}
                                </div>

                                {/* 9:16 모바일 폰 프레임 */}
                                {hasVideo || item.thumbnail_url ? (
                                    <div 
                                        onClick={togglePlayPause}
                                        className="relative w-[150px] h-[266px] rounded-lg overflow-hidden bg-black border-2 border-slate-700/80 shadow-md group cursor-pointer flex items-center justify-center"
                                    >
                                        <video 
                                            ref={videoRef}
                                            src={streamUrl} 
                                            poster={item.thumbnail_url}
                                            autoPlay 
                                            muted={isMuted}
                                            loop 
                                            playsInline
                                            onLoadedMetadata={handleLoadedMetadata}
                                            className="w-full h-full object-cover bg-black"
                                        />
                                        {item.thumbnail_url && !isPlaying && (
                                            <img src={item.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                                        )}

                                        {/* 재생/정지 오버레이 인디케이터 */}
                                        {!isPlaying && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                                                    <Play className="w-5 h-5 ml-0.5 fill-white" />
                                                </div>
                                            </div>
                                        )}

                                        {/* 우하단 음소거 토글 버튼 */}
                                        <button
                                            onClick={toggleMute}
                                            className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs transition-all z-10"
                                            title={isMuted ? "소리 켜기" : "음소거"}
                                        >
                                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
                                        </button>

                                        {/* 상단 숏폼 해상도/길이 배지 */}
                                        {videoInfo && (
                                            <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-[8px] font-mono text-white/90 px-1 py-0.5 rounded">
                                                {videoInfo.width}×{videoInfo.height} {videoInfo.duration > 0 && `· ${formatDuration(videoInfo.duration)}`}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => onAttach(item.id)}
                                        className="w-[150px] h-[266px] rounded-lg border-2 border-dashed border-border/80 bg-background/50 flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                                    >
                                        <FileVideo className="w-7 h-7 text-muted-foreground/60 mb-1" />
                                        <p className="text-[11px] font-semibold text-muted-foreground">영상 미첨부</p>
                                        <p className="text-[9px] text-muted-foreground/70 mt-0.5">클릭하여 연결</p>
                                        <Button size="sm" variant="outline" className="h-5 text-[9px] mt-2 border-border px-1.5">
                                            <Paperclip className="w-2.5 h-2.5 mr-0.5" /> 영상 첨부
                                        </Button>
                                    </div>
                                )}

                                <p className="text-[9px] text-muted-foreground/80 text-center">
                                    {hasVideo ? "화면 클릭 시 재생/정지" : "9:16 쇼츠 지원"}
                                </p>
                            </div>

                            {/* [우측] 📝 콘텐츠 메타 (60%) + ⚙️ 배포/채널 설정 (40%) */}
                            <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                
                                {/* 1) 콘텐츠 메타 (7칸 - 약 58%) */}
                                <div className="lg:col-span-7 rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                <FileText className="w-3.5 h-3.5 text-indigo-500" /> 콘텐츠 메타데이터
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => copyText(item.title, '제목 복사됨')}>
                                                <Copy className="w-2.5 h-2.5 mr-1" /> 제목 복사
                                            </Button>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground font-medium">제목</span>
                                            <p className="font-semibold text-xs leading-snug mt-0.5 break-words bg-background/80 p-2 rounded-lg border border-border">
                                                {item.title || '--'}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground font-medium">설명</span>
                                                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" onClick={() => copyText(item.description, '설명 복사됨')}>
                                                    <Copy className="w-2.5 h-2.5 mr-1" /> 설명 복사
                                                </Button>
                                            </div>
                                            <div className="text-[11px] text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto bg-background/80 p-2 rounded-lg border border-border mt-0.5 break-words">
                                                {item.description || '(설명 없음)'}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted-foreground font-medium">태그</span>
                                                <p className="text-[11px] truncate bg-background/80 p-1.5 rounded-lg border border-border mt-0.5">{item.tags?.length ? item.tags.join(', ') : '--'}</p>
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-[10px] text-muted-foreground font-medium">해시태그</span>
                                                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate bg-background/80 p-1.5 rounded-lg border border-border mt-0.5">{item.hashtags?.length ? item.hashtags.join(' ') : '--'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 파일 경로 박스 */}
                                    <div className="pt-2 border-t border-border/50">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                            <span>영상 파일 경로</span>
                                            {hasVideo && (
                                                <Button variant="ghost" size="sm" className="h-4 text-[9px] px-1" onClick={() => copyText(item.video_file_path, '경로 복사됨')}>
                                                    <Copy className="w-2.5 h-2.5 mr-0.5" /> 복사
                                                </Button>
                                            )}
                                        </div>
                                        <p className="font-mono text-[10px] text-muted-foreground break-all bg-background/80 p-1.5 rounded-lg border border-border">
                                            {item.video_file_path || '미첨부'}
                                        </p>
                                    </div>
                                </div>

                                {/* 2) 배포 & 채널 설정 (5칸 - 약 42%) */}
                                <div className="lg:col-span-5 rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5 min-w-0 overflow-hidden flex flex-col justify-between">
                                    <div className="space-y-2.5">
                                        <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                            <Rocket className="w-3.5 h-3.5 text-indigo-500" /> 플랫폼 채널 및 스케줄
                                        </span>
                                        
                                        <div className="space-y-1.5">
                                            {item.target_platforms?.includes('youtube') && (
                                                <div className="p-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 shrink-0">🎬 YT</span>
                                                    <Select
                                                        value={(item.platform_configs?.youtube?.channel_id) || ''}
                                                        onValueChange={(v) => onUpdateChannel(item.id, 'youtube', v)}
                                                    >
                                                        <SelectTrigger className="h-6 text-[10px] bg-background border-border flex-1">
                                                            <SelectValue placeholder="채널 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {channels.map((ch: any) => (
                                                                <SelectItem key={ch.channel_id} value={ch.channel_id}>
                                                                    {ch.channel_name || ch.title} ({ch.subscriber_count?.toLocaleString()}명)
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {item.target_platforms?.includes('tiktok') && (
                                                <div className="p-1.5 rounded-lg bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300 shrink-0">🎵 TT</span>
                                                    <Select
                                                        value={(item.platform_configs?.tiktok?.account_id) || ''}
                                                        onValueChange={(v) => onUpdateChannel(item.id, 'tiktok', v)}
                                                    >
                                                        <SelectTrigger className="h-6 text-[10px] bg-background border-border flex-1">
                                                            <SelectValue placeholder="계정 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tiktokChannels.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {c.nickname || c.id}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            {item.target_platforms?.includes('instagram') && (
                                                <div className="p-1.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 shrink-0">📸 IG</span>
                                                    <Select
                                                        value={(item.platform_configs?.instagram?.account_id) || ''}
                                                        onValueChange={(v) => onUpdateChannel(item.id, 'instagram', v)}
                                                    >
                                                        <SelectTrigger className="h-6 text-[10px] bg-background border-border flex-1">
                                                            <SelectValue placeholder="계정 선택" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {instagramChannels.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {c.nickname || c.id}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground font-medium">업로드 방식</span>
                                                <Select value={item.upload_method || 'BROWSER_AUTO'} onValueChange={(v) => onUpdateUploadMethod(item.id, v)}>
                                                    <SelectTrigger className="h-6 text-[10px] bg-background border-border mt-0.5">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="BROWSER_AUTO">스텔스 자동화</SelectItem>
                                                        <SelectItem value="API">Google API</SelectItem>
                                                        <SelectItem value="MANUAL">수동</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground font-medium">예약 시각</span>
                                                <p className="font-semibold text-[11px] mt-1 bg-background/80 p-1 rounded border border-border truncate">
                                                    {item.scheduled_upload_time ? new Date(item.scheduled_upload_time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '즉시 등록'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                            <div><span>외부ID:</span> <span className="font-mono">{item.source_external_id || '--'}</span></div>
                                            <div><span>Batch:</span> <span className="font-mono">{item.source_batch_id ? item.source_batch_id.slice(0, 10) : '--'}</span></div>
                                        </div>
                                        {rawFailureReason && (
                                            <FailureReasonCard
                                                failureReason={rawFailureReason}
                                                onRetry={onReset ? () => onReset(item.id) : undefined}
                                            />
                                        )}

                                    </div>
                                </div>
                            </div>
                        </div>

                        {item.upload_method === 'MANUAL' && (
                            <ManualUploadAssist item={item} />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const ManualUploadAssist = ({ item }: { item: any }) => {

    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { label: '제목', key: 'title', value: item.title },
        { label: '설명', key: 'description', value: item.description },
        { label: '태그', key: 'tags', value: item.tags?.join(', ') },
        { label: '해시태그', key: 'hashtags', value: item.hashtags?.join(' ') },
        { label: '영상 경로', key: 'video_file_path', value: item.video_file_path }
    ].filter(s => s.value);

    const handleInjectText = async (text: string, stepIndex?: number, key?: string) => {
        if (!text) return;
        try {
            const res = await fetchWithRetry('/api/browser/type-active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text,
                    press_enter: key === 'video_file_path' 
                })
            });
            if (res.status === 'success') {
                toast({ title: "입력 완료", description: "포커스된 입력창에 내용이 입력되었습니다." });
                if (stepIndex !== undefined && stepIndex < steps.length - 1) {
                    setCurrentStep(stepIndex + 1);
                }
            } else {
                throw new Error("Failed to inject");
            }
        } catch (e) {
            toast({ title: "입력 실패", description: "클립보드에 복사했습니다. 수동으로 붙여넣어주세요 (Ctrl+V)", variant: "destructive" });
            navigator.clipboard.writeText(text);
        }
    };

    if (steps.length === 0) return null;

    return (
        <div className="mt-2 p-3 border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-lg text-xs w-full">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-300">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" /> 수동 업로드 어시스턴트
                </div>
                <Badge variant="secondary" className="text-[10px] py-0 bg-indigo-100 text-indigo-700">Step {currentStep + 1} / {steps.length}</Badge>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
                {steps.map((step, idx) => (
                    <Button 
                        key={step.key} 
                        variant={currentStep === idx ? "default" : "outline"}
                        size="sm"
                        className={`h-6 text-[11px] px-2 ${currentStep === idx ? "bg-indigo-600 text-white" : "border-indigo-200 text-indigo-700"}`}
                        onClick={() => { setCurrentStep(idx); handleInjectText(step.value, idx, step.key); }}
                    >
                        {step.label} 입력
                    </Button>
                ))}
            </div>
            <div className="bg-background border rounded p-1.5 text-[11px] font-mono text-muted-foreground break-all max-h-14 overflow-y-auto">
                {steps[currentStep]?.value || '내용 없음'}
            </div>
        </div>
    );
};

const VideoPlayerDialog = ({ isOpen, setIsOpen, item }: any) => {
    const { toast } = useToast();
    const [hasError, setHasError] = useState(false);
    if (!item) return null;

    const streamUrl = getStreamUrl(item.video_file_path);

    const handleOpenInSystem = async () => {
        if ((window as any).electronAPI?.openPath && item.video_file_path) {
            await (window as any).electronAPI.openPath(item.video_file_path);
            toast({ title: "외부 플레이어 실행", description: "시스템 기본 플레이어로 열었습니다." });
        } else {
            toast({ variant: "destructive", title: "실행 불가", description: "Electron 환경에서 지원됩니다." });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setHasError(false); }}>
            <DialogContent className="max-w-3xl bg-card p-0 border border-border overflow-hidden">
                <DialogHeader className="p-3 border-b border-border bg-muted/40">
                    <DialogTitle className="text-sm font-semibold truncate flex items-center justify-between">
                        <span className="truncate">{item.title || '영상 미리보기'}</span>
                        <Button size="sm" variant="outline" className="h-6 text-[11px] ml-2" onClick={handleOpenInSystem}>
                            기본 플레이어로 열기
                        </Button>
                    </DialogTitle>
                </DialogHeader>
                <div className="bg-black relative aspect-video flex items-center justify-center">
                    {hasError ? (
                        <div className="text-center p-6 text-slate-400 space-y-2">
                            <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
                            <p className="text-xs text-slate-300">내장 플레이어에서 영상을 로드할 수 없습니다.</p>
                            <p className="text-[10px] font-mono text-slate-500 break-all">{item.video_file_path}</p>
                            <Button size="sm" variant="secondary" className="text-xs mt-2" onClick={handleOpenInSystem}>
                                외부 기본 플레이어로 재생
                            </Button>
                        </div>
                    ) : (
                        <video
                            src={streamUrl}
                            controls
                            autoPlay
                            className="w-full h-full max-h-[60vh] object-contain"
                            onError={() => setHasError(true)}
                        />
                    )}
                </div>
                <div className="p-3 bg-card border-t border-border text-xs">
                    <p className="font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] font-mono text-muted-foreground break-all mt-0.5">{item.video_file_path || '영상 경로 없음'}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
};



const AddVideoDialog = ({ isOpen, setIsOpen, onSuccess, initialData }: any) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [tiktokChannels, setTiktokChannels] = useState<any[]>([]);
    const [instagramChannels, setInstagramChannels] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const defaultForm = {
        title: '', description: '', hashtags: '', tags: '', video_file_path: '', source_external_id: '',
        enable_shopping_tag: false, shopping_tag_keyword: '',
        source_type: 'MANUAL', approval_required: false, upload_method: 'BROWSER_AUTO',
        target_platforms: ['youtube'],
        platform_configs: {
            youtube: { channel_id: '', privacy: 'private', category: '22', made_for_kids: false, headless_mode: true },
            tiktok: { account_id: '', privacy: 'private', allow_comments: true, allow_duet: true },
            instagram: { account_id: '', caption: '', share_to_feed: false }
        },
        scheduleMode: 'immediate' as 'immediate' | 'scheduled', scheduledTime: ''
    };
    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const pc = initialData.platform_configs || {};
                const mergedConfigs = {
                    youtube: { ...defaultForm.platform_configs.youtube, ...(pc.youtube || {}) },
                    tiktok: { ...defaultForm.platform_configs.tiktok, ...(pc.tiktok || {}) },
                    instagram: { ...defaultForm.platform_configs.instagram, ...(pc.instagram || {}) },
                };
                const safeData: any = {};
                for (const key of Object.keys(initialData)) {
                    if (initialData[key] != null) safeData[key] = initialData[key];
                }
                setForm({
                    ...defaultForm,
                    ...safeData,
                    source_external_id: safeData.source_external_id || '',
                    video_file_path: safeData.video_file_path || '',
                    description: safeData.description || '',
                    tags: Array.isArray(safeData.tags) ? safeData.tags.join(', ') : (safeData.tags || ''),
                    hashtags: Array.isArray(safeData.hashtags) ? safeData.hashtags.join(' ') : (safeData.hashtags || ''),
                    platform_configs: mergedConfigs,
                    target_platforms: safeData.target_platforms || defaultForm.target_platforms,
                    scheduleMode: safeData.scheduled_upload_time ? 'scheduled' : 'immediate',
                    scheduledTime: safeData.scheduled_upload_time ? (safeData.scheduled_upload_time.includes('T') ? safeData.scheduled_upload_time : safeData.scheduled_upload_time.replace(' ', 'T')).slice(0, 16) : '',
                });
            } else setForm(defaultForm);
        }
        loadChannels();
        loadSocialChannels();
    }, [isOpen, initialData]);

    const loadSocialChannels = async () => {
        try {
            const [r1, r2] = await Promise.all([fetchWithRetry('/api/tiktok-channels/'), fetchWithRetry('/api/instagram-channels/')]);
            if (r1.ok) setTiktokChannels(await r1.json());
            if (r2.ok) setInstagramChannels(await r2.json());
        } catch (_) { }
    };

    const loadChannels = async () => {
        try {
            const r = await fetchWithRetry('/api/youtube/all');
            if (!r.ok) throw new Error();
            const data = await r.json();
            setChannels(Array.isArray(data) ? data : []);
            if (data.length > 0 && !form.platform_configs?.youtube?.channel_id) setForm(prev => ({ ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...(prev.platform_configs?.youtube || {}), channel_id: data[0].channel_id } } }));
        } catch (_) { setChannels([]); }
    };

    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);

    const handleBrowseVideo = async () => {
        if ((window as any).electronAPI?.selectVideoFile) {
            const r = await (window as any).electronAPI.selectVideoFile();
            if (r.success && r.path) {
                setForm({ ...form, video_file_path: r.path });
                return;
            }
        }
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 브라우저 환경: 서버로 multipart 업로드
        setIsUploadingVideo(true);
        setUploadPercent(0);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/work-queue/upload');

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadPercent(percent);
                }
            };

            const uploadPromise = new Promise<{ server_file_path: string; file_name: string }>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            resolve(data);
                        } catch (err) {
                            reject(err);
                        }
                    } else {
                        reject(new Error(xhr.responseText || '업로드 실패'));
                    }
                };
                xhr.onerror = () => reject(new Error('네트워크 오류로 업로드 실패'));
            });

            xhr.send(formData);
            const data = await uploadPromise;

            setForm({ ...form, video_file_path: data.server_file_path });
            toast({ title: "영상 업로드 완료", description: `서버에 안전하게 저장되었습니다: ${file.name}` });
        } catch (err: any) {
            toast({ variant: "destructive", title: "업로드 실패", description: err.message || '서버 오류' });
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleDraftSave = async () => {
        if (!form.title.trim()) { toast({ variant: "destructive", title: "필수", description: "제목은 필수입니다" }); return; }

        const payload: any = {
            title: form.title,
            description: form.description,
            tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            hashtags: form.hashtags.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
            source_external_id: form.source_external_id,
            source_type: form.source_type,
            target_platforms: form.target_platforms,
            platform_configs: form.platform_configs,
            upload_method: form.upload_method
        };
        if (form.video_file_path) payload.video_file_path = form.video_file_path;

        try {
            const url = initialData ? `/api/work-queue/items/${initialData.id}` : '/api/work-queue/items/draft';
            const method = initialData ? 'PATCH' : 'POST';
            const r = await fetchWithRetry(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (r.ok) { toast({ title: "임시 보관됨", description: "기본 정보가 저장되었습니다. 나중에 영상을 첨부하고 즉시 등록할 수 있습니다." }); setIsOpen(false); onSuccess(); setForm(defaultForm); }
            else { const e = await r.json(); toast({ variant: "destructive", title: "오류", description: e.detail }); }
        } catch (_) { toast({ variant: "destructive", title: "오류", description: "임시 저장 실패" }); }
    };

    const handleImmediateSubmit = async (e: any) => {
        e.preventDefault();
        if (!form.title.trim()) { toast({ variant: "destructive", title: "필수", description: "제목은 필수입니다" }); return; }

        const payload = {
            ...form,
            tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            hashtags: form.hashtags.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
            source_external_id: form.source_external_id,
            scheduled_upload_time: form.scheduleMode === 'scheduled' ? form.scheduledTime : null,
        };

        const isEditingDraft = initialData && (initialData.status === 'DRAFT' || initialData.status === 'PENDING');
        const videoChanged = isEditingDraft && form.video_file_path && form.video_file_path !== initialData.video_file_path;

        // Validation: must have video unless it's an existing draft with video already attached
        const alreadyHasVideo = isEditingDraft && initialData.video_file_path && !videoChanged;
        if (!form.video_file_path.trim() && !alreadyHasVideo) {
            toast({ variant: "destructive", title: "필수", description: "영상 파일을 선택해주세요" });
            return;
        }
        if (form.target_platforms.includes('youtube') && !form.platform_configs.youtube.channel_id) {
            toast({ variant: "destructive", title: "필수", description: "채널을 선택해주세요" });
            return;
        }

        try {
            if (isEditingDraft) {
                // Step 1: Update metadata
                const metaPayload: any = {
                    title: payload.title,
                    description: payload.description,
                    hashtags: payload.hashtags,
                    tags: payload.tags,
                    source_external_id: payload.source_external_id,
                    source_type: payload.source_type,
                    target_platforms: payload.target_platforms,
                    platform_configs: payload.platform_configs,
                    upload_method: payload.upload_method,
                    scheduled_upload_time: payload.scheduled_upload_time,
                };
                const r1 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(metaPayload)
                });
                if (!r1.ok) { const e = await r1.json(); throw new Error(e.detail || 'Metadata update failed'); }

                // Step 2: Attach video if changed
                if (videoChanged) {
                    const r2 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}/attach`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ video_file_path: form.video_file_path })
                    });
                    if (!r2.ok) { const e = await r2.json(); throw new Error(e.detail || 'Video attach failed'); }
                }

                // Step 3: Finalize (DRAFT/PENDING → QUEUED + trigger upload)
                const r3 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}/finalize`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        approval_required: false,
                        upload_method: form.upload_method,
                        target_platforms: form.target_platforms,
                        scheduled_upload_time: form.scheduleMode === 'scheduled' ? form.scheduledTime : null,
                    })
                });
                if (!r3.ok) { const e = await r3.json(); throw new Error(e.detail || 'Finalize failed'); }
                const f3 = await r3.json();
                toast({ title: "등록됨", description: f3.upload_queued ? "대기열 등록 및 업로드 시작됨" : "대기열에 등록됨" });
            } else {
                // New item: use the full POST with video
                const fullPayload = { ...payload, video_file_path: form.video_file_path };
                const r = await fetchWithRetry('/api/work-queue/items', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fullPayload)
                });
                if (r.ok) { toast({ title: "등록됨", description: "대기열에 추가되었습니다" }); }
                else { const e = await r.json(); toast({ variant: "destructive", title: "오류", description: e.detail }); return; }
            }
            setIsOpen(false);
            onSuccess();
            setForm(defaultForm);
        } catch (err: any) {
            toast({ variant: "destructive", title: "등록 실패", description: err?.message || '서버 오류' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
                <DialogHeader><DialogTitle>{initialData ? '항목 수정' : '새 항목'}</DialogTitle><DialogDescription>기본 정보를 입력하고 영상을 첨부하세요</DialogDescription></DialogHeader>
                <form onSubmit={handleImmediateSubmit} className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-3"><TabsTrigger value="basic">기본 정보</TabsTrigger><TabsTrigger value="upload">업로드 설정</TabsTrigger><TabsTrigger value="platform">플랫폼</TabsTrigger></TabsList>
                        <TabsContent value="basic" className="space-y-4">
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                                <div><Label>제목 *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="bg-background border-border" /></div>
                                <div><Label>설명</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="bg-background border-border" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>해시태그</Label><Input value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#shorts #viral" className="bg-background border-border" /></div>
                                    <div><Label>태그 (쉼표 구분)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2" className="bg-background border-border" /></div>
                                </div>
                                <div>
                                    <Label>영상 파일 *</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input value={form.video_file_path} onChange={e => setForm({ ...form, video_file_path: e.target.value })} placeholder="파일을 선택하거나 경로를 입력하세요" className="bg-background border-border flex-1" />
                                        <Button type="button" variant="outline" onClick={handleBrowseVideo} disabled={isUploadingVideo} className="shrink-0 font-medium">
                                            {isUploadingVideo ? <Loader2 className="w-4 h-4 mr-1 animate-spin text-primary" /> : <FolderOpen className="w-4 h-4 mr-1" />}
                                            {isUploadingVideo ? `${uploadPercent}% 업로드 중` : '찾아보기'}
                                        </Button>
                                        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />
                                    </div>
                                    {isUploadingVideo && (
                                        <div className="mt-2 space-y-1">
                                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-primary h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">서버로 영상 전송 중... {uploadPercent}%</p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>외부 ID</Label><Input value={form.source_external_id} onChange={e => setForm({ ...form, source_external_id: e.target.value })} placeholder="예: CSV 행 ID" className="bg-background border-border" /></div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div>
                                        <Label>쇼핑 태그</Label><p className="text-xs text-muted-foreground">업로드 시 제품 자동 태깅</p>
                                    </div>
                                    <Switch checked={form.enable_shopping_tag} onCheckedChange={c => setForm({ ...form, enable_shopping_tag: c })} />
                                </div>
                                {form.enable_shopping_tag && (
                                    <div className="bg-muted/40 p-3 rounded-lg">
                                        <Label>제품 키워드</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input value={form.shopping_tag_keyword} onChange={e => setForm({ ...form, shopping_tag_keyword: e.target.value })} placeholder="예: 캠핑 의자" className="bg-background border-border" />
                                            <Button type="button" variant="secondary" onClick={async () => {
                                                try {
                                                    const r = await fetchWithRetry('/api/work-queue/extract-shopping-keyword', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: form.title, description: form.description }) });
                                                    const d = await r.json();
                                                    if (d.keyword) setForm({ ...form, shopping_tag_keyword: d.keyword });
                                                } catch (_) { }
                                            }} disabled={isGenerating}>AI 추출</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="upload" className="space-y-4">
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                                <div><Label>소스</Label><Select value={form.source_type} onValueChange={v => setForm({ ...form, source_type: v })}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MANUAL">수동</SelectItem><SelectItem value="WORKFLOW">워크플로우</SelectItem><SelectItem value="BULK_IMPORT">일괄 가져오기</SelectItem></SelectContent></Select></div>
                                <div><Label>업로드 방식</Label><Select value={form.upload_method} onValueChange={v => setForm({ ...form, upload_method: v })}><SelectTrigger className="bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="API">Google API</SelectItem><SelectItem value="BROWSER_AUTO">브라우저 자동화</SelectItem><SelectItem value="MANUAL">수동</SelectItem></SelectContent></Select></div>
                                <div className="flex items-center gap-2 pt-3 border-t"><Checkbox checked={form.approval_required} onCheckedChange={c => setForm({ ...form, approval_required: !!c })} /><Label>승인 필요 (체크 해제 시 자동 대기열)</Label></div>
                                <div>
                                    <Label>스케줄</Label>
                                    <div className="flex gap-4 mt-1">
                                        <label className="flex items-center gap-2"><input type="radio" checked={form.scheduleMode === 'immediate'} onChange={() => setForm({ ...form, scheduleMode: 'immediate' })} /> 즉시</label>
                                        <label className="flex items-center gap-2"><input type="radio" checked={form.scheduleMode === 'scheduled'} onChange={() => setForm({ ...form, scheduleMode: 'scheduled' })} /> 예약</label>
                                    </div>
                                    {form.scheduleMode === 'scheduled' && (
                                        <div className="mt-2"><Input type="datetime-local" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} className="bg-background border-border" /></div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="platform" className="space-y-4">
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                                <Label>대상 플랫폼</Label>
                                <div className="flex gap-4">{['youtube', 'tiktok', 'instagram'].map(p => <label key={p} className="flex items-center gap-2"><Checkbox checked={form.target_platforms.includes(p)} onCheckedChange={c => c ? setForm({ ...form, target_platforms: [...form.target_platforms, p] }) : setForm({ ...form, target_platforms: form.target_platforms.filter(x => x !== p) })} /> <span className="capitalize">{p}</span></label>)}</div>
                            </div>
                            {form.target_platforms.includes('youtube') && (
                                <div className="space-y-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-400">YouTube</h4>
                                    <div><Label>채널 *</Label><Select value={form.platform_configs.youtube.channel_id} onValueChange={v => setForm({ ...form, platform_configs: { ...form.platform_configs, youtube: { ...form.platform_configs.youtube, channel_id: v } } })} disabled={channels.length === 0}><SelectTrigger className="bg-background"><SelectValue placeholder={channels.length ? "채널 선택" : "연결된 채널 없음"} /></SelectTrigger><SelectContent>{channels.map(ch => <SelectItem key={ch.channel_id} value={ch.channel_id}>{ch.channel_name || ch.title} ({ch.subscriber_count?.toLocaleString()}명)</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>공개 설정</Label><Select value={form.platform_configs.youtube.privacy} onValueChange={v => setForm({ ...form, platform_configs: { ...form.platform_configs, youtube: { ...form.platform_configs.youtube, privacy: v } } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">공개</SelectItem><SelectItem value="unlisted">미등록</SelectItem><SelectItem value="private">비공개</SelectItem></SelectContent></Select></div>
                                    <div className="flex items-center gap-2"><Checkbox checked={form.platform_configs.youtube.headless_mode} onCheckedChange={c => setForm({ ...form, platform_configs: { ...form.platform_configs, youtube: { ...form.platform_configs.youtube, headless_mode: !!c } } })} disabled={form.upload_method !== 'BROWSER_AUTO'} /><Label>헤드리스 모드</Label></div>
                                </div>
                            )}
                            {form.target_platforms.includes('tiktok') && (
                                <div className="space-y-3 p-4 bg-pink-50/50 dark:bg-pink-900/10 rounded-lg border border-pink-200">
                                    <h4 className="font-semibold text-sm text-pink-700 dark:text-pink-400">TikTok</h4>
                                    <div><Label>계정 *</Label><Select value={form.platform_configs.tiktok.account_id} onValueChange={v => setForm({ ...form, platform_configs: { ...form.platform_configs, tiktok: { ...form.platform_configs.tiktok, account_id: v } } })}><SelectTrigger className="bg-background"><SelectValue placeholder="계정 선택" /></SelectTrigger><SelectContent>{tiktokChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>공개 설정</Label><Select value={form.platform_configs.tiktok.privacy} onValueChange={v => setForm({ ...form, platform_configs: { ...form.platform_configs, tiktok: { ...form.platform_configs.tiktok, privacy: v } } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="public">공개</SelectItem><SelectItem value="private">비공개</SelectItem></SelectContent></Select></div>
                                    <div className="flex gap-4"><label className="flex items-center gap-2"><Checkbox checked={form.platform_configs.tiktok.allow_comments} onCheckedChange={c => setForm({ ...form, platform_configs: { ...form.platform_configs, tiktok: { ...form.platform_configs.tiktok, allow_comments: !!c } } })} /> 댓글</label><label className="flex items-center gap-2"><Checkbox checked={form.platform_configs.tiktok.allow_duet} onCheckedChange={c => setForm({ ...form, platform_configs: { ...form.platform_configs, tiktok: { ...form.platform_configs.tiktok, allow_duet: !!c } } })} /> Duet</label></div>
                                </div>
                            )}
                            {form.target_platforms.includes('instagram') && (
                                <div className="space-y-3 p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200">
                                    <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-400">Instagram</h4>
                                    <div><Label>계정 *</Label><Select value={form.platform_configs.instagram.account_id} onValueChange={v => setForm({ ...form, platform_configs: { ...form.platform_configs, instagram: { ...form.platform_configs.instagram, account_id: v } } })}><SelectTrigger className="bg-background"><SelectValue placeholder="계정 선택" /></SelectTrigger><SelectContent>{instagramChannels.map(c => <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label>캡션</Label><Textarea value={form.platform_configs.instagram.caption} onChange={e => setForm({ ...form, platform_configs: { ...form.platform_configs, instagram: { ...form.platform_configs.instagram, caption: e.target.value } } })} rows={2} placeholder="릴스 캡션..." /></div>
                                    <label className="flex items-center gap-2"><Checkbox checked={form.platform_configs.instagram.share_to_feed} onCheckedChange={c => setForm({ ...form, platform_configs: { ...form.platform_configs, instagram: { ...form.platform_configs.instagram, share_to_feed: !!c } } })} /> 피드 공유</label>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-between gap-2 pt-3 border-t">
                        <div>
                            <Button type="button" variant="outline" onClick={handleDraftSave} className="border-slate-300">
                                <Save className="w-4 h-4 mr-1" /> 임시 보관
                            </Button>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Rocket className="w-4 h-4 mr-1" /> {initialData ? '수정 완료' : '즉시 등록'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const BulkImportDialog = ({ isOpen, setIsOpen, onSuccess }: { isOpen: boolean; setIsOpen: (v: boolean) => void; onSuccess: () => void }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [batchId, setBatchId] = useState('');
    const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done'>('idle');
    const cachedFileBytes = useRef<Uint8Array | null>(null);
    const cachedFileName = useRef<string>('');

    const parseCSVField = (line: string): string[] => {
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
                    else { inQuotes = false; }
                } else { current += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === ',') { fields.push(current.trim()); current = ''; }
                else { current += ch; }
            }
        }
        fields.push(current.trim());
        return fields;
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { toast({ variant: "destructive", title: "Invalid CSV", description: "Need at least 2 rows (header + data)" }); return; }
        const h = parseCSVField(lines[0]);
        const rows = lines.slice(1).map(line => {
            const vals = parseCSVField(line);
            const obj: any = {};
            h.forEach((k, i) => obj[k] = vals[i] ?? '');
            return obj;
        });
        setHeaders(h);
        normalizeRows(rows, h);
    };

    const parseExcel = async (file: File, rawBytes?: Uint8Array) => {
        try {
            const XLSX = await import('xlsx');
            const ab = rawBytes || new Uint8Array(await file.arrayBuffer());
            const workbook = XLSX.read(ab, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
            if (json.length < 2) { toast({ variant: "destructive", title: "Invalid Excel", description: "Need at least 2 rows" }); return; }
            const h = json[0].map((c: any) => String(c || '').trim());
            setHeaders(h);
            const rows = json.slice(1).map(row => {
                const obj: any = {};
                h.forEach((k: string, i: number) => obj[k] = row[i] != null ? String(row[i]).trim() : '');
                return obj;
            });
            normalizeRows(rows, h);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Excel parse error", description: err?.message || 'Failed to read file' });
        }
    };

    const normalizeRows = (rows: any[], h: string[]) => {
        const tCol = h.find(h => ['title', '제목', 'name'].includes(h.toLowerCase()));
        const dCol = h.find(h => ['description', 'desc', '설명'].includes(h.toLowerCase()));
        const eCol = h.find(h => ['external_id', 'id', '외부id'].includes(h.toLowerCase()));
        const hCol = h.find(h => ['hashtags'].includes(h.toLowerCase()));
        const tagCol = h.find(h => ['tags', '태그'].includes(h.toLowerCase()));
        const umCol = h.find(h => ['upload_method', '업로드방식'].includes(h.toLowerCase()));
        const platCol = h.find(h => ['platforms', '플랫폼'].includes(h.toLowerCase()));
        const ppCol = h.find(h => ['platform_privacy', '공개설정'].includes(h.toLowerCase()));
        const stCol = h.find(h => ['scheduled_time', '예약시간'].includes(h.toLowerCase()));

        if (!tCol) {
            toast({ variant: "destructive", title: "title 컬럼 없음", description: "title, 제목, name 중 하나의 컬럼이 반드시 필요합니다. 템플릿을 다운로드하여 참고하세요." });
            return;
        }

        let skipped = 0;
        const mapped: any[] = [];
        rows.forEach((r, i) => {
            const titleVal = String(r[tCol] || '').trim();
            if (!titleVal) { skipped++; return; }

            const hashtagsRaw = hCol ? String(r[hCol] || '') : '';
            const tagsRaw = tagCol ? String(r[tagCol] || '') : '';

            const item: any = {
                external_id: (eCol ? String(r[eCol] || '') : `row_${i + 1}`).trim() || `row_${i + 1}`,
                title: titleVal,
                description: (dCol ? String(r[dCol] || '') : ''),
                hashtags: hashtagsRaw.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
                tags: tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean),
                upload_method: umCol ? String(r[umCol] || '').trim() || 'BROWSER_AUTO' : 'BROWSER_AUTO',
                target_platforms: platCol ? String(r[platCol] || '').split(',').map((p: string) => p.trim()).filter(Boolean) : ['youtube'],
                platform_privacy: ppCol ? String(r[ppCol] || '').trim().toLowerCase() || 'public' : 'public',
                scheduled_time: stCol ? String(r[stCol] || '').trim() || null : null,
            };
            if (item.target_platforms.length === 0) item.target_platforms = ['youtube'];

            mapped.push(item)
        });

        setParsedRows(mapped);
        if (skipped > 0) {
            toast({ title: `${mapped.length} rows parsed`, description: `${skipped}개 항목은 title이 없어 건너뛰었습니다. 총 ${mapped.length}개를 등록합니다.` });
        } else {
            toast({ title: `${mapped.length} rows parsed`, description: `Columns: ${h.join(', ')}` });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        cachedFileName.current = file.name;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv') {
            const text = await file.text();
            cachedFileBytes.current = new TextEncoder().encode(text);
            parseCSV(text);
        } else if (ext === 'xlsx' || ext === 'xls') {
            const ab = await file.arrayBuffer();
            const bytes = new Uint8Array(ab);
            cachedFileBytes.current = bytes;
            await parseExcel(file, bytes);
        } else {
            toast({ variant: "destructive", title: "Unsupported", description: "Only .csv and .xlsx files are supported" });
        }
    };

    const handleSendDrafts = async () => {
        if (!parsedRows.length) return;
        setSendStatus('sending');
        try {
            const fileName = cachedFileName.current;
            const bytes = cachedFileBytes.current;
            if (bytes && fileName.endsWith('.xlsx')) {
                const base64 = uint8ArrayToBase64(bytes);
                const res = await fetchWithRetry('/api/work-queue/bulk/upload-file', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64_file: base64, file_name: fileName, source_batch_id: batchId || undefined })
                });
                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.detail || `Server error ${res.status}`);
                }
                const result = await res.json();
                if (result.batch_id) setBatchId(result.batch_id);
                toast({ title: `${result.count} drafts created`, description: `Batch: ${result.batch_id?.substring(0, 8)}...` });
                setSendStatus('done');
                setIsOpen(false);
                onSuccess();
                return;
            }
            const items = parsedRows.map(r => {
                const platformConfigs: any = {};
                if (r.platform_privacy) {
                    r.target_platforms?.forEach((p: string) => {
                        platformConfigs[p] = { ...(platformConfigs[p] || {}), privacy: r.platform_privacy };
                    });
                }
                return {
                    title: r.title,
                    description: r.description || '',
                    hashtags: r.hashtags || [],
                    tags: r.tags || [],
                    source_external_id: r.external_id,
                    source_type: 'BULK_IMPORT',
                    upload_method: r.upload_method || 'BROWSER_AUTO',
                    target_platforms: r.target_platforms || ['youtube'],
                    platform_configs: Object.keys(platformConfigs).length ? platformConfigs : null,
                    scheduled_upload_time: r.scheduled_time || null,
                };
            });
            const res = await fetchWithRetry('/api/work-queue/items/bulk/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, source_batch_id: batchId || undefined })
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.detail || `Server error ${res.status}`);
            }
            const result = await res.json();
            if (result.batch_id) setBatchId(result.batch_id);
            toast({ title: `${result.count} imported items`, description: `Batch: ${result.batch_id?.substring(0, 8)}...` });
            setSendStatus('done');
            setIsOpen(false);
            onSuccess();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Import failed", description: err?.message || 'Server error' });
            setSendStatus('idle');
        }
    };

    const reset = () => { setParsedRows([]); setHeaders([]); setBatchId(''); setSendStatus('idle'); cachedFileBytes.current = null; cachedFileName.current = ''; if (fileInputRef.current) fileInputRef.current.value = ''; };

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
                <DialogHeader><DialogTitle>일괄 등록</DialogTitle><DialogDescription>CSV 또는 Excel 파일로 여러 항목을 한번에 대기열에 등록합니다</DialogDescription></DialogHeader>
                <div className="space-y-4">
                    <Card className="border-2 border-dashed border-border hover:border-indigo-300 transition-colors">
                        <CardContent className="p-8 text-center">
                            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" id="bulk-import-file-input" />
                            <label htmlFor="bulk-import-file-input" className="cursor-pointer block">
                                <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                                <h3 className="font-semibold text-foreground mb-1">CSV 또는 Excel 파일 선택</h3>
                                <div className="text-xs text-muted-foreground mb-4">.csv / .xlsx 지원. 첫 행 = 컬럼 헤더</div>
                                <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />파일 선택
                                </span>
                            </label>
                            <div className="text-xs text-muted-foreground mt-3 flex gap-3 justify-center">
                                <a href="/api/work-queue/template/csv" download className="text-indigo-600 hover:underline flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" />.csv 템플릿</a>
                                <a href="/api/work-queue/template/xlsx" download className="text-indigo-600 hover:underline flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" />.xlsx 템플릿</a>
                            </div>
                        </CardContent>
                    </Card>

                    {parsedRows.length > 0 && (
                        <>
                            <div className="bg-muted/40 rounded-lg p-3 border border-border">
                                <div className="text-xs text-muted-foreground">검출된 컬럼: {headers.map(h => (
                                    <Badge key={h} variant="outline" className="ml-1 text-[11px]">{h}</Badge>
                                ))}</div>
                                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                                    매핑:{" "}
                                    <Badge variant="outline" className="text-[11px]">title→제목</Badge>
                                    <Badge variant="outline" className="text-[11px]">description→설명</Badge>
                                    <Badge variant="outline" className="text-[11px]">external_id→외부ID</Badge>
                                    <Badge variant="outline" className="text-[11px]">hashtags→해시태그</Badge>
                                    <Badge variant="outline" className="text-[11px]">tags→태그</Badge>
                                    <Badge variant="outline" className="text-[11px]">upload_method→업로드방식</Badge>
                                    <Badge variant="outline" className="text-[11px]">platforms→플랫폼</Badge>
                                    <Badge variant="outline" className="text-[11px]">platform_privacy→공개설정</Badge>
                                    <Badge variant="outline" className="text-[11px]">scheduled_time→예약시간</Badge>
                                </div>
                            </div>

                            <div className="max-h-64 overflow-auto rounded border border-border">
                                <table className="w-full text-xs border-collapse">
                                    <thead><tr className="bg-muted/50">
                                        <th className="p-2 text-left border-b w-8">#</th>
                                        <th className="p-2 text-left border-b">외부 ID</th>
                                        <th className="p-2 text-left border-b">제목</th>
                                        <th className="p-2 text-left border-b">설명</th>
                                        <th className="p-2 text-left border-b">해시태그</th>
                                        <th className="p-2 text-left border-b">플랫폼</th>
                                        <th className="p-2 text-left border-b">공개</th>
                                        <th className="p-2 text-left border-b">예약</th>
                                    </tr></thead>
                                    <tbody>{parsedRows.slice(0, 100).map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-muted/30">
                                            <td className="p-2 text-xs text-muted-foreground border-b">{i + 1}</td>
                                            <td className="p-2 text-xs font-mono border-b">{row.external_id}</td>
                                            <td className="p-2 text-sm truncate max-w-48 border-b">{row.title}</td>
                                            <td className="p-2 text-xs text-muted-foreground truncate max-w-64 border-b">{row.description}</td>
                                            <td className="p-2 text-xs text-muted-foreground max-w-32 border-b truncate">{row.hashtags?.join(' ') || '--'}</td>
                                            <td className="p-2 text-xs text-muted-foreground border-b">{row.target_platforms?.join(', ') || 'youtube'}</td>
                                            <td className="p-2 text-xs text-muted-foreground border-b">{row.platform_privacy || 'public'}</td>
                                            <td className="p-2 text-xs text-muted-foreground border-b">{row.scheduled_time || '--'}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                                {parsedRows.length > 100 && <div className="text-xs text-muted-foreground p-2">처음 100개 / 총 {parsedRows.length}개 항목</div>}
                            </div>
                        </>
                    )}
                </div>
                <div className="flex justify-between gap-2 pt-3 border-t">
                    <Button variant="outline" onClick={() => { setIsOpen(false); reset(); }}>취소</Button>
                    <Button onClick={handleSendDrafts} disabled={sendStatus === 'sending' || !parsedRows.length} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {sendStatus === 'sending' ? '저장 중...' : sendStatus === 'done' ? '수신됨' : <><ArrowRight className="w-4 h-4 mr-2" /> 대기열로 보내기 ({parsedRows.length})</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WorkQueue;