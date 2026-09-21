import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    Plus, Upload, RefreshCw, Trash2, Edit, CheckCircle, Check, XCircle, Clock,
    AlertTriangle, Shield, Play, FileText, ArrowRight, FolderOpen,
    Eye, EyeOff, Paperclip, Rocket, RotateCcw, FileVideo, Layers, Clock4,
    FileCheck, Hash, Files, Filter, ChevronDown, ChevronUp, Copy, Film,
    Save, FileSpreadsheet, Send, Search, ArrowUpDown, Workflow, Pause,
    PlaySquare, Settings, Table, Columns2, Volume2, VolumeX, X, SlidersHorizontal,
    Loader2, Sparkles, ExternalLink, MousePointer, UploadCloud
} from 'lucide-react';


const getStreamUrl = (filePath: string) => {
    if (!filePath) return '';
    // Electron 데스크톱 앱(file:// 또는 커스텀 프로토콜)에서는 FastAPI 백엔드 주소를 명시해야 net::ERR_FILE_NOT_FOUND 방지
    const isDevHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.port !== '8000';
    const baseUrl = isDevHttp ? '' : 'http://127.0.0.1:8000';
    return `${baseUrl}/api/work-queue/stream?path=${encodeURIComponent(filePath)}`;
};

const getThumbnailUrl = (filePath?: string, thumbPath?: string) => {
    const target = thumbPath || filePath;
    if (!target) return '';
    const isDevHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.port !== '8000';
    const baseUrl = isDevHttp ? '' : 'http://127.0.0.1:8000';
    return `${baseUrl}/api/work-queue/thumbnail?path=${encodeURIComponent(target)}`;
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
    const [officialExports, setOfficialExports] = useState<any[]>(() => getLocalCache('officialExports', []));
    const [isLoadingExports, setIsLoadingExports] = useState(false);
    // 강화된 검색/정렬 상태
    const [channelFilter, setChannelFilter] = useState('all');
    const [uploadMethodFilter, setUploadMethodFilter] = useState('all');
    const [sortField, setSortField] = useState<'created_at' | 'scheduled_at' | 'channel' | 'status'>('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    // 대량 항목 대응: 페이지네이션 및 전체 접기/펼치기 상태
    const [pageSize, setPageSize] = useState<number>(25);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [allExpanded, setAllExpanded] = useState<boolean | null>(null);

    // 승인 자동화 거버넌스 모드 (SMART: 채널/85점 기반 자동승인, MANUAL: 전수 수동, AUTONOMOUS: 완전 자율)
    const [governanceMode, setGovernanceMode] = useState<'SMART' | 'MANUAL' | 'AUTONOMOUS'>('SMART');

    // 마우스 러버밴드 드래그 다중 선택 상태 및 Refs
    const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    const [isDragSelecting, setIsDragSelecting] = useState(false);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const dragStartSelectedIds = useRef<Set<number>>(new Set());
    const itemCardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const justFinishedDrag = useRef(false);

    const handleListMouseDown = (e: React.MouseEvent) => {
        // 마우스 좌클릭(0)에만 반응
        if (e.button !== 0) return;

        const target = e.target as HTMLElement;
        // 버튼, 입력창, 선택기, 텍스트에어리어, 체크박스, 비디오, 링크 등 인터랙티브 요소는 드래그 시작 제외
        if (
            target.closest('button') ||
            target.closest('input') ||
            target.closest('select') ||
            target.closest('textarea') ||
            target.closest('a') ||
            target.closest('[role="button"]') ||
            target.closest('[role="combobox"]') ||
            target.closest('[role="checkbox"]') ||
            target.closest('[data-no-drag]') ||
            target.closest('video')
        ) {
            return;
        }

        dragStartPos.current = { x: e.clientX, y: e.clientY };
        if (e.ctrlKey || e.shiftKey || e.metaKey) {
            dragStartSelectedIds.current = new Set(selectedItems);
        } else {
            dragStartSelectedIds.current = new Set();
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragStartPos.current) return;

            const dist = Math.hypot(e.clientX - dragStartPos.current.x, e.clientY - dragStartPos.current.y);
            // 6px 이상 이동해야 드래그 선택 모드로 진입 (단순 클릭과 분리하여 카드 펼침 유지)
            if (!isDragSelecting && dist < 6) return;

            if (!isDragSelecting) {
                setIsDragSelecting(true);
            }

            const startX = dragStartPos.current.x;
            const startY = dragStartPos.current.y;
            const currentX = e.clientX;
            const currentY = e.clientY;

            setSelectionBox({ startX, startY, currentX, currentY });

            const boxRect = {
                left: Math.min(startX, currentX),
                top: Math.min(startY, currentY),
                right: Math.max(startX, currentX),
                bottom: Math.max(startY, currentY),
            };

            const newlySelected = new Set(dragStartSelectedIds.current);

            Object.entries(itemCardRefs.current).forEach(([idStr, el]) => {
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const isIntersecting = !(
                    boxRect.left > rect.right ||
                    boxRect.right < rect.left ||
                    boxRect.top > rect.bottom ||
                    boxRect.bottom < rect.top
                );
                const itemId = Number(idStr);
                if (isIntersecting) {
                    newlySelected.add(itemId);
                } else if (!dragStartSelectedIds.current.has(itemId)) {
                    newlySelected.delete(itemId);
                }
            });

            setSelectedItems(Array.from(newlySelected));
        };

        const handleMouseUp = () => {
            dragStartPos.current = null;
            if (isDragSelecting) {
                setIsDragSelecting(false);
                setSelectionBox(null);
                justFinishedDrag.current = true;
                setTimeout(() => {
                    justFinishedDrag.current = false;
                }, 100);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragSelecting]);

    // 브라우저 창 표시/숨김 글로벌 토글 (채널 육성과 동일한 일괄 제어 UX)
    const [showBrowserWindow, setShowBrowserWindow] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('vl_work_queue_browser_visible');
            return saved !== null ? saved === 'true' : false; // 기본값: 백그라운드 스텔스 (창 꺼짐)
        }
        return false;
    });

    const loadGovernanceMode = async () => {
        try {
            const res = await fetchWithRetry('/api/work-queue/governance-mode');
            if (res.ok) {
                const data = await res.json();
                if (data.governance_mode) {
                    setGovernanceMode(data.governance_mode);
                }
                if (data.headless_mode !== undefined) {
                    const isVisible = !data.headless_mode;
                    setShowBrowserWindow(isVisible);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('vl_work_queue_browser_visible', String(isVisible));
                    }
                }
            }
        } catch (_) {}
    };

    const handleGovernanceModeChange = async (mode: 'SMART' | 'MANUAL' | 'AUTONOMOUS') => {
        setGovernanceMode(mode);
        try {
            const res = await fetchWithRetry('/api/work-queue/governance-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode })
            });
            if (res.ok) {
                const labels: Record<string, string> = {
                    'SMART': '⭐ 스마트 자동 승인 모드 (신뢰 채널 / 85점 이상 시 자동 승인)',
                    'MANUAL': '🛡️ 전수 수동 승인 모드 (모든 등록 영상을 사용자가 직접 확인)',
                    'AUTONOMOUS': '⚡ 완전 자율 무인 배포 모드 (등록 즉시 100% 자동 대기열 등록)'
                };
                toast({
                    title: "승인 거버넌스 정책 변경",
                    description: labels[mode] || mode
                });
            }
        } catch (_) {
            toast({ variant: "destructive", title: "거버넌스 설정 저장 실패" });
        }
    };

    const handleToggleBrowserWindow = async (checked: boolean) => {
        setShowBrowserWindow(checked);
        if (typeof window !== 'undefined') {
            localStorage.setItem('vl_work_queue_browser_visible', String(checked));
        }
        try {
            const res = await fetchWithRetry(`/api/work-queue/toggle-headless?headless=${!checked}`, {
                method: 'POST'
            });
            if (res.ok) {
                toast({
                    title: checked ? "🖥️ 브라우저 창 표시 켜짐" : "🛡️ 백그라운드 스텔스 모드 (창 숨김)",
                    description: checked
                        ? "영상 업로드 시 브라우저 화면이 표시되어 진행 상황을 직접 모니터링할 수 있습니다."
                        : "영상 업로드 시 브라우저 창이 뜨지 않고 백그라운드에서 조용히 자동 실행됩니다."
                });
                loadQueueItems();
            }
        } catch (_) {
            toast({
                title: checked ? "🖥️ 창 표시 켜짐 (로컬)" : "🛡️ 창 숨김 (로컬)",
                description: "브라우저 화면 표시 설정이 변경되었습니다."
            });
        }
    };

    useEffect(() => {
        // [Headless Sync & Governance Sync]
        loadGovernanceMode();
        loadQueueItems();
        loadStats();
        loadAllChannels();
        loadOfficialExports();
        loadBatchGroups();
        setCurrentPage(1);
        const interval = setInterval(() => {
            // [최적화] 탭/창이 백그라운드에 있거나 비활성화된 경우 불필요한 네트워크/디스크 폴링 스킵
            if (typeof document !== 'undefined' && document.hidden) return;
            loadQueueItems();
            loadStats();
            loadBatchGroups();
        }, 10000);
        return () => clearInterval(interval);
    }, [activeTab, dateFilter, limit, searchQuery, selectedBatch, channelFilter, uploadMethodFilter, sortField, sortDir]);

    // [최적화] 사용자가 다른 앱 작업 후 창으로 복귀 시 1회 즉각 최신화
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && !document.hidden) {
                loadQueueItems();
                loadStats();
                loadBatchGroups();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [activeTab, dateFilter, limit, searchQuery, selectedBatch]);

    const connectWebSocket = (itemId: number) => {
        const isFile = window.location.protocol === 'file:' || !window.location.host;
        const wsHost = isFile ? '127.0.0.1:8000' : window.location.host;
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${wsHost}/api/work-queue/ws/progress/${itemId}`);
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
            setQueueItems(prevItems => {
                // [최적화] 스마트 얕은 비교: 아이템 개수, 각 ID, 상태, 업로드 진행률, 경로가 동일하면 참조 유지 (React 전체 리렌더링 차단)
                if (prevItems.length === items.length) {
                    const isIdentical = prevItems.every((prev, idx) => {
                        const cur = items[idx];
                        return cur &&
                            prev.id === cur.id &&
                            prev.status === cur.status &&
                            prev.upload_progress === cur.upload_progress &&
                            prev.video_file_path === cur.video_file_path &&
                            prev.thumbnail_path === cur.thumbnail_path &&
                            prev.thumbnail_url === cur.thumbnail_url;
                    });
                    if (isIdentical) {
                        return prevItems; // 기존 참조 반환으로 컴포넌트 트리 렌더링 스킵
                    }
                }
                setLocalCache('queueItems', items);
                return items;
            });
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

    const loadOfficialExports = async () => {
        setIsLoadingExports(true);
        try {
            const res = await fetchWithRetry('/api/work-queue/official-exports');
            if (res.ok) {
                const data = await res.json();
                const files = Array.isArray(data.files) ? data.files : [];
                setOfficialExports(files);
                setLocalCache('officialExports', files);
            }
        } catch (_) {
            setOfficialExports([]);
        } finally {
            setIsLoadingExports(false);
        }
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
        const v: Record<string, { className: string; label: string }> = {
            'PENDING': { className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/50', label: '승인 대기' },
            'APPROVED': { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/50', label: '승인 완료' },
            'AUTO_APPROVED': { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-400 dark:border-blue-700 font-semibold', label: '⭐ 자동 승인' },
            'REJECTED': { className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300/50', label: '반려' },
        };
        const badge = v[approvalStatus];
        if (!badge) return <Badge className="text-[10px] py-0 px-1.5">{approvalStatus}</Badge>;
        return <Badge className={`text-[10px] py-0 px-1.5 font-medium border ${badge.className}`}>{badge.label}</Badge>;
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
        const currentPlatforms = Array.isArray(item.target_platforms) && item.target_platforms.length > 0
            ? item.target_platforms
            : ['youtube'];
        const updatedPlatforms = currentPlatforms.includes(platform) ? currentPlatforms : [...currentPlatforms, platform];

        const payload: any = {
            target_platforms: updatedPlatforms,
            platform_configs: { ...currentConfigs, [platform]: { ...(currentConfigs[platform] || {}), [key]: value } }
        };
        if (platform === 'youtube') {
            payload.channel_id = value;
        }
        handleUpdateItem(itemId, payload);
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
                    {/* 승인 자동화 거버넌스 정책 셀렉터 */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-card shadow-2xs text-xs shrink-0">
                        <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-muted-foreground font-medium text-[11px] shrink-0">승인 정책:</span>
                        <Select value={governanceMode} onValueChange={(val: any) => handleGovernanceModeChange(val)}>
                            <SelectTrigger className="h-6 text-[11px] bg-transparent border-0 font-bold focus:ring-0 p-0 gap-1 w-auto">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SMART">⭐ 스마트 자동 승인 (신뢰 채널 / 85점 이상)</SelectItem>
                                <SelectItem value="MANUAL">🛡️ 전수 수동 승인 (모든 영상 수동 확인)</SelectItem>
                                <SelectItem value="AUTONOMOUS">⚡ 완전 자율 무인 배포 (등록 즉시 대기열)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Browser Window Visibility Switch (채널 육성과 동일한 일괄 제어 UX) */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-border bg-card shadow-2xs text-xs shrink-0">
                        <Switch
                            id="wq-browser-visible-toggle"
                            checked={showBrowserWindow}
                            onCheckedChange={handleToggleBrowserWindow}
                            className="scale-75"
                        />
                        <Label
                            htmlFor="wq-browser-visible-toggle"
                            className="text-xs cursor-pointer select-none font-medium flex items-center gap-1.5 text-foreground"
                        >
                            {showBrowserWindow ? <Eye className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                            <span>창 표시: <strong className={showBrowserWindow ? "text-blue-600 dark:text-blue-400 font-bold" : "text-muted-foreground font-normal"}>{showBrowserWindow ? "켜짐 (화면 표시)" : "꺼짐 (백그라운드)"}</strong></span>
                        </Label>
                    </div>

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

            {/* 2. 대기열 상태 통계 요약 카드 (7개 상태 완벽 동기화 & 활성 탭 하이라이트) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 w-full">
                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-indigo-400 transition-all ${
                        activeTab === 'all' ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('all')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-slate-400 transition-all ${
                        activeTab === 'draft' ? 'ring-2 ring-slate-500 border-slate-500 bg-slate-50/20 dark:bg-slate-900/20' : ''
                    }`} 
                    onClick={() => setActiveTab('draft')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-amber-400 transition-all ${
                        activeTab === 'pending' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('pending')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-blue-400 transition-all ${
                        activeTab === 'queued' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('queued')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-violet-400 transition-all ${
                        activeTab === 'uploading' ? 'ring-2 ring-violet-500 border-violet-500 bg-violet-50/20 dark:bg-violet-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('uploading')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-emerald-400 transition-all ${
                        activeTab === 'completed' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('completed')}
                >
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

                <Card 
                    className={`border-border bg-card shadow-2xs cursor-pointer hover:border-red-400 transition-all ${
                        activeTab === 'failed_review' ? 'ring-2 ring-red-500 border-red-500 bg-red-50/20 dark:bg-red-950/20' : ''
                    }`} 
                    onClick={() => setActiveTab('failed_review')}
                >
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
                        <Button size="sm" variant="outline" onClick={handleBatchReset} className="h-7 text-xs border-border hover:bg-muted font-medium" title="선택한 항목들을 승인 대기 상태로 초기화합니다">
                            <RotateCcw className="w-3 h-3 mr-1" /> 선택 초기화
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleBatchDelete} className="h-7 text-xs font-medium">
                            <Trash2 className="w-3 h-3 mr-1" /> 일괄 삭제
                        </Button>
                    </div>
                </div>
            )}

            <VideoPlayerDialog isOpen={isPlayerOpen} setIsOpen={setIsPlayerOpen} item={playingItem} />
            <AddVideoDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                onSuccess={() => { loadQueueItems(); loadStats(); setIsAddDialogOpen(false); }}
                initialData={editingItem}
                showBrowserWindow={showBrowserWindow}
            />
            <BulkImportDialog 
                isOpen={showBulkImport} 
                setIsOpen={setShowBulkImport} 
                onSuccess={() => { loadQueueItems(); loadStats(); }} 
                channels={channels}
                showBrowserWindow={showBrowserWindow}
            />
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

                            {/* 대량 항목 대응: 전체 접기/펼치기 원클릭 버튼 */}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAllExpanded(prev => !prev)}
                                className="h-7 text-xs px-2.5 border-border gap-1 shrink-0 bg-background hover:bg-muted/60"
                                title={allExpanded ? "모든 항목 상세 접기" : "모든 항목 상세 펼치기"}
                            >
                                {allExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />}
                                <span className="hidden sm:inline font-medium">{allExpanded ? "모두 접기" : "모두 펼치기"}</span>
                            </Button>

                            {/* 마우스 드래그 다중 선택 안내 배지 */}
                            <div
                                className="hidden xl:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 border border-border/70 px-2 py-1 rounded-md shrink-0 select-none"
                                title="목록의 빈 영역이나 카드를 마우스로 드래그하여 여러 영상을 일괄 선택할 수 있습니다 (Shift/Ctrl 키로 추가 선택)"
                            >
                                <MousePointer className="w-3 h-3 text-indigo-500" />
                                <span>드래그 다중 선택</span>
                            </div>

                            {/* 대량 항목 대응: 페이지 당 표시 건수 셀렉터 */}
                            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                                <SelectTrigger className="h-7 text-xs bg-background shrink-0 w-auto min-w-[76px] whitespace-nowrap px-2 border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10개씩</SelectItem>
                                    <SelectItem value="25">25개씩</SelectItem>
                                    <SelectItem value="50">50개씩</SelectItem>
                                    <SelectItem value="100">100개씩</SelectItem>
                                    <SelectItem value="-1">전체 보기</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* 필터 초기화 버튼 */}
                            {(searchQuery || selectedBatch !== 'all' || dateFilter !== 'all' || channelFilter !== 'all' || uploadMethodFilter !== 'all' || sortField !== 'created_at' || sortDir !== 'desc') && (
                                <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap">
                                    <Filter className="w-3 h-3 mr-1" /> 초기화
                                </Button>
                            )}
                        </div>
                    </div>

                </div>

                {/* 6. 고밀도 대기열 리스트 뷰 (페이지네이션 & 대량 항목 최적화) */}
                <TabsContent 
                    value={activeTab} 
                    className={`mt-3 w-full ${isDragSelecting ? 'select-none' : ''}`}
                    onMouseDown={handleListMouseDown}
                    onClickCapture={(e) => {
                        if (justFinishedDrag.current) {
                            e.stopPropagation();
                            e.preventDefault();
                        }
                    }}
                >
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
                    ) : (() => {
                        const totalCount = filteredAndSortedItems.length;
                        const effectivePageSize = pageSize === -1 ? totalCount : pageSize;
                        const totalPages = Math.max(1, Math.ceil(totalCount / effectivePageSize));
                        const safePage = Math.min(Math.max(1, currentPage), totalPages);
                        const startIndex = (safePage - 1) * effectivePageSize;
                        const paginatedItems = pageSize === -1
                            ? filteredAndSortedItems
                            : filteredAndSortedItems.slice(startIndex, startIndex + effectivePageSize);

                        return (
                            <div className="space-y-3 w-full">
                                <div className="space-y-2 w-full">
                                    {paginatedItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            ref={el => { itemCardRefs.current[item.id] = el; }}
                                            className="queue-card-container w-full"
                                        >
                                            <QueueItemCompactCard
                                                index={startIndex + idx + 1}
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
                                                onUpdateItem={handleUpdateItem}
                                                onRefresh={() => { loadQueueItems(); loadStats(); }}
                                                channels={channels}
                                                tiktokChannels={tiktokChannels}
                                                instagramChannels={instagramChannels}
                                                officialExports={officialExports}
                                                isLoadingExports={isLoadingExports}
                                                onRefreshOfficialExports={loadOfficialExports}
                                                getStatusBadge={getStatusBadge}
                                                getApprovalBadge={getApprovalBadge}
                                                selectedItems={selectedItems}
                                                toggleItemSelection={toggleItemSelection}
                                                isUploadingAttach={uploadingItemId === item.id}
                                                targetItemId={targetItemId}
                                                forceExpanded={allExpanded}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* 하단 페이지네이션 컨트롤러 (대량 영상 관리 필수) */}
                                {totalCount > 0 && pageSize !== -1 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-2 border-t border-border/70 text-xs text-muted-foreground w-full">
                                        <div className="text-[11px]">
                                            전체 <strong className="text-foreground font-bold">{totalCount}</strong>개 항목 중{' '}
                                            <strong className="text-foreground font-bold">{startIndex + 1}</strong> ~{' '}
                                            <strong className="text-foreground font-bold">{Math.min(startIndex + effectivePageSize, totalCount)}</strong>개 표시
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage <= 1}
                                                onClick={() => setCurrentPage(1)}
                                                className="h-7 px-2 text-xs border-border bg-card"
                                            >
                                                처음
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage <= 1}
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className="h-7 px-2.5 text-xs border-border bg-card"
                                            >
                                                이전
                                            </Button>
                                            <div className="px-3 py-1 rounded bg-muted/60 text-xs font-bold text-foreground border border-border/60">
                                                {safePage} / {totalPages}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage >= totalPages}
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className="h-7 px-2.5 text-xs border-border bg-card"
                                            >
                                                다음
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={safePage >= totalPages}
                                                onClick={() => setCurrentPage(totalPages)}
                                                className="h-7 px-2 text-xs border-border bg-card"
                                            >
                                                마지막
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </TabsContent>
            </Tabs>

            {/* 마우스 러버밴드 드래그 다중 선택 박스 오버레이 (Marquee Selection) */}
            {isDragSelecting && selectionBox && (
                <div
                    className="fixed pointer-events-none border-2 border-indigo-500 bg-indigo-500/20 z-50 rounded-lg shadow-sm"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.currentX),
                        top: Math.min(selectionBox.startY, selectionBox.currentY),
                        width: Math.abs(selectionBox.currentX - selectionBox.startX),
                        height: Math.abs(selectionBox.currentY - selectionBox.startY),
                    }}
                />
            )}

            {/* 7. 플로팅 일괄 작업 바 (스크롤 중에도 항상 즉시 접근 가능) */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 dark:bg-card/95 backdrop-blur-md border-2 border-indigo-500/80 shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4">
                    <Badge className="bg-indigo-600 text-white text-xs px-2.5 py-0.5">{selectedItems.length}개 선택됨</Badge>
                    <div className="h-4 w-px bg-border mx-0.5" />
                    <Button size="sm" onClick={handleBatchApprove} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> 일괄 승인
                    </Button>
                    <Button size="sm" onClick={handleBatchFinalize} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs">
                        <Rocket className="w-3.5 h-3.5 mr-1" /> 일괄 대기열 등록
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBatchReset} className="h-7 text-xs border-border hover:bg-muted font-medium shadow-xs" title="선택한 항목들을 승인 대기 상태로 초기화합니다">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> 선택 초기화
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBatchDelete} className="h-7 text-xs font-medium shadow-xs">
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> 일괄 삭제
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedItems([])} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                        선택 해제
                    </Button>
                </div>
            )}

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
    if (!rawReason || rawReason.trim() === '' || rawReason === 'FAILED' || rawReason === 'null' || rawReason === 'None') {
        return {
            title: "업로드 자동화 처리 중단",
            description: "스텔스 브라우저 세션 만료, 채널 인증 또는 네트워크 일시적 지연으로 업로드가 중단되었습니다.",
            actionGuide: "채널 로그인 상태를 점검하거나 우측 상단의 [즉시 재시도] 버튼을 눌러 다시 실행해 보세요.",
            rawMessage: rawReason || "Status: FAILED\n(시스템 상세 에러 로그가 기록되지 않았거나 자동화 프로세스가 일시 중단되었습니다.)"
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

    // 1. 브라우저 자동화 요소 탐색 및 폼 조작 타임아웃
    if (lower.includes('scroll_into_view') || lower.includes('locator') || lower.includes('timeout') || lower.includes('wait_for') || lower.includes('did not match')) {
        const isTT = platform === 'tiktok';
        const isIG = platform === 'instagram';
        const platformStudio = isTT ? '틱톡(TikTok) 스튜디오' : isIG ? '인스타그램 웹' : '유튜브 스튜디오';
        return {
            platform: platformName,
            title: `${platformName ? platformName + ' ' : ''}스튜디오 UI 요소 탐색 타임아웃`,
            description: `${platformStudio} 페이지의 폼 입력 요소(게시 버튼, 팝업 모달, 입력 필드 등) 처리 중 시간 초과가 발생했습니다.`,
            actionGuide: `최신 ${platformStudio} UI 대응 로직이 반영되었으므로 [즉시 재시도]를 눌러 다시 진행해 주세요.`,
            rawMessage: rawReason
        };
    }

    // 2. 플랫폼 일일 업로드 한도
    if (lower.includes('quota') || lower.includes('daily limit') || lower.includes('upload limit') || lower.includes('일일 업로드') || lower.includes('한도 초과')) {
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

    if (lower.includes('network') || lower.includes('connect') || lower.includes('econnrefused')) {
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

// === 주권 멀티라인 네트워크 회선 뱃지 렌더러 (LTE 1080~1089, 고정 ISP, 로컬 직결) ===
const renderChannelNetworkBadge = (ch: any) => {
    if (!ch) return null;
    if (ch.bound_device_serial) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                📱 LTE ({ch.bound_device_serial})
            </span>
        );
    }
    if (ch.proxy_port && ch.proxy_port >= 1080 && ch.proxy_port <= 1089) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                📱 모바일 포트 {ch.proxy_port}
            </span>
        );
    }
    if (ch.proxy_mode === 'MANUAL' || ch.proxy_host) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                🌐 ISP 고정 {ch.proxy_port ? `(${ch.proxy_port})` : ''}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
            🛡️ 로컬 단독 회선
        </span>
    );
};

interface ViralPreviewResult {
    caption: string;
    hookOrBody?: string;
    tags: string[];
    isCustom: boolean;
    note: string;
}

const computeViralPreview = (
    platform: 'tiktok' | 'instagram' | 'youtube',
    title: string,
    desc: string,
    hashtagsStr: string,
    customCaption?: string
): ViralPreviewResult => {
    const rawTags = (hashtagsStr || '')
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean);

    const tabooMap: Record<string, Set<string>> = {
        tiktok: new Set(["shorts", "쇼츠", "youtube", "유튜브", "youtubeshorts", "유튜브쇼츠", "sub", "subscribe", "구독", "좋아요댓글구독", "채널"]),
        instagram: new Set(["shorts", "쇼츠", "youtube", "유튜브", "youtubeshorts", "유튜브쇼츠", "sub", "subscribe", "구독"]),
        youtube: new Set(["fyp", "foryou", "foryoupage", "틱톡", "틱톡순삭", "tiktok", "reels", "릴스"])
    };
    const taboo = tabooMap[platform] || new Set();
    const sanitizedBase = rawTags.filter(t => !taboo.has(t.toLowerCase())).map(t => `#${t}`);

    const corpus = `${title} ${desc} ${sanitizedBase.join(' ')}`.toLowerCase();
    const niches: string[] = [];
    if (/고양이|cat|강아지|dog|반려|pet|puppy|동물|animal/.test(corpus)) niches.push('animal');
    if (/유머|funny|웃긴|개그|meme|밈|폭소|병맛|코미디/.test(corpus)) niches.push('humor');
    if (/먹방|요리|food|cook|mukbang|맛집|레시피|recipe|디저트/.test(corpus)) niches.push('food');
    if (/상식|지식|꿀팁|팁|정보|fact|역사|과학|경제|이슈/.test(corpus)) niches.push('knowledge');

    if (platform === 'tiktok') {
        if (customCaption && customCaption.trim()) {
            const userTags = (customCaption.match(/#[A-Za-z0-9가-힣_]+/g) || [])
                .filter(t => !taboo.has(t.replace('#', '').toLowerCase()));
            return {
                caption: customCaption.trim(),
                tags: userTags,
                isCustom: true,
                note: "사용자 맞춤 캡션 직접 사용 중 (유튜브 오염 태그 자동 배제)"
            };
        }
        const rawText = (desc || title || '').trim();
        const firstLine = rawText.split('\n')[0].replace(/#[A-Za-z0-9가-힣_]+/g, '').trim();
        let hook = firstLine || title.trim();
        if (hook.length > 100) hook = hook.slice(0, 97) + '...';

        const nicheTagsMap: Record<string, string[]> = {
            animal: ['#catsoftiktok', '#댕댕이'],
            humor: ['#유머스타그램', '#웃긴영상'],
            food: ['#foodtiktok', '#먹방틱톡'],
            knowledge: ['#틱톡교실', '#1분지식']
        };
        const nicheTags = niches.flatMap(n => nicheTagsMap[n] || []);
        const combined = Array.from(new Set(['#fyp', '#틱톡순삭', ...nicheTags, ...sanitizedBase, '#foryou'])).slice(0, 5);
        return {
            caption: `${hook}\n\n${combined.join(' ')}`,
            hookOrBody: hook,
            tags: combined,
            isCustom: false,
            note: "✨ 100% 자동 변환: 자막 가림 방지 2줄 훅 캡션 + #fyp #틱톡순삭 바이럴 4~5개 주입"
        };
    } else if (platform === 'instagram') {
        if (customCaption && customCaption.trim()) {
            const userTags = (customCaption.match(/#[A-Za-z0-9가-힣_]+/g) || [])
                .filter(t => !taboo.has(t.replace('#', '').toLowerCase()));
            return {
                caption: customCaption.trim(),
                tags: userTags,
                isCustom: true,
                note: "사용자 맞춤 캡션 직접 사용 중"
            };
        }
        const rawText = (desc || title || '').trim();
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        const bodyLines = lines
            .filter(l => !l.split(/\s+/).every(tok => tok.startsWith('#')))
            .map(l => l.replace(/(?:\s*#[A-Za-z0-9가-힣_]+)+$/, '').trim())
            .filter(Boolean);
        const body = bodyLines.join('\n') || title.trim();

        const nicheTagsMap: Record<string, string[]> = {
            animal: ['#냥스타그램', '#댕스타그램', '#펫스타그램'],
            humor: ['#유머', '#오늘의유머', '#웃긴짤'],
            food: ['#먹스타그램', '#맛스타그램', '#요리스타그램'],
            knowledge: ['#꿀팁', '#정보공유', '#상식']
        };
        const nicheTags = niches.flatMap(n => nicheTagsMap[n] || []);
        const combined = Array.from(new Set(['#reels', '#reelsinstagram', ...nicheTags, ...sanitizedBase, '#viralreels'])).slice(0, 7);
        return {
            caption: `${body}\n.\n.\n${combined.join(' ')}`,
            hookOrBody: body,
            tags: combined,
            isCustom: false,
            note: "✨ 100% 자동 변환: 릴스 감성 본문 서식 + #reels #reelsinstagram 5~7개 주입"
        };
    } else {
        const combined = Array.from(new Set(['#shorts', ...sanitizedBase])).slice(0, 8);
        return {
            caption: `${desc}\n\n${combined.join(' ')}`.trim(),
            tags: combined,
            isCustom: false,
            note: "✨ 유튜브 쇼츠: #shorts 태그 필수 보장 및 타 플랫폼 태그 0% 배제"
        };
    }
};

const QueueItemCompactCard = ({
    index, item, onApprove, onReject, onDelete, onReset, onEdit, onPlay,
    onAttach, onFinalize, onUpdateUploadMethod, onUpdateChannel, onUpdateItem,
    onRefresh,
    channels, tiktokChannels, instagramChannels,
    officialExports = [], isLoadingExports = false, onRefreshOfficialExports,
    getStatusBadge, getApprovalBadge, selectedItems, toggleItemSelection,
    isUploadingAttach, targetItemId, forceExpanded
}: any) => {

    const { toast } = useToast();
    const isTarget = targetItemId && item.id === targetItemId;
    const [expanded, setExpanded] = useState(isTarget || false);

    useEffect(() => {
        if (forceExpanded !== null && forceExpanded !== undefined) {
            setExpanded(forceExpanded);
        }
    }, [forceExpanded]);

    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [videoInfo, setVideoInfo] = useState<{ width: number; height: number; duration: number; isVertical: boolean } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Video Source State ---
    const [editVideoFilePath, setEditVideoFilePath] = useState(item.video_file_path || '');
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // --- Content Metadata State ---
    const [editTitle, setEditTitle] = useState(item.title || '');
    const [editDescription, setEditDescription] = useState(item.description || '');
    const [editHashtags, setEditHashtags] = useState(
        Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || '')
    );
    const [editTags, setEditTags] = useState(
        Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')
    );

    // --- Target Platforms & Active Sub-Tab ---
    const initialPlatforms = Array.isArray(item.target_platforms) && item.target_platforms.length > 0
        ? item.target_platforms.filter((p: string) => p !== 'douyin')
        : ['youtube'];
    const [editTargetPlatforms, setEditTargetPlatforms] = useState<string[]>(initialPlatforms);
    const [activePlatformTab, setActivePlatformTab] = useState<'youtube' | 'tiktok' | 'instagram'>(
        initialPlatforms.includes('youtube') ? 'youtube' : (initialPlatforms[0] as any) || 'youtube'
    );

    // --- YouTube Configs ---
    const [editChannelId, setEditChannelId] = useState(
        item.platform_configs?.youtube?.channel_id || item.channel_id || ''
    );
    const [editPrivacy, setEditPrivacy] = useState(
        item.platform_configs?.youtube?.privacy || (item.scheduled_upload_time ? 'scheduled' : 'private')
    );
    const [editScheduleTime, setEditScheduleTime] = useState(
        item.scheduled_upload_time
            ? (item.scheduled_upload_time.includes('T') ? item.scheduled_upload_time : item.scheduled_upload_time.replace(' ', 'T')).slice(0, 16)
            : ''
    );
    const [editHeadlessMode, setEditHeadlessMode] = useState<boolean>(() => {
        const pc = item.platform_configs || {};
        const hl = pc.headless_mode ?? pc.tiktok?.headless_mode ?? pc.instagram?.headless_mode ?? pc.youtube?.headless_mode;
        return hl !== undefined ? !hl : (typeof window !== 'undefined' ? localStorage.getItem('vl_work_queue_browser_visible') === 'true' : false);
    });
    const [editEnableShoppingTag, setEditEnableShoppingTag] = useState(Boolean(item.enable_shopping_tag));
    const [editShoppingTagKeyword, setEditShoppingTagKeyword] = useState(item.shopping_tag_keyword || '');
    const [isExtractingShoppingKeyword, setIsExtractingShoppingKeyword] = useState(false);

    // --- TikTok Configs ---
    const [editTiktokAccountId, setEditTiktokAccountId] = useState(
        item.platform_configs?.tiktok?.account_id || ''
    );
    const [editTiktokPrivacy, setEditTiktokPrivacy] = useState(
        item.platform_configs?.tiktok?.privacy || 'private'
    );
    const [editTiktokAllowComments, setEditTiktokAllowComments] = useState(
        item.platform_configs?.tiktok?.allow_comments !== undefined ? Boolean(item.platform_configs.tiktok.allow_comments) : true
    );
    const [editTiktokAllowDuet, setEditTiktokAllowDuet] = useState(
        item.platform_configs?.tiktok?.allow_duet !== undefined ? Boolean(item.platform_configs.tiktok.allow_duet) : true
    );
    const [editTiktokCaption, setEditTiktokCaption] = useState(
        item.platform_configs?.tiktok?.caption || ''
    );

    // --- Instagram Configs ---
    const [editInstagramAccountId, setEditInstagramAccountId] = useState(
        item.platform_configs?.instagram?.account_id || ''
    );
    const [editInstagramShareToFeed, setEditInstagramShareToFeed] = useState(
        Boolean(item.platform_configs?.instagram?.share_to_feed)
    );
    const [editInstagramCaption, setEditInstagramCaption] = useState(
        item.platform_configs?.instagram?.caption || ''
    );

    // --- Common / Governance ---
    const [editUploadMethod, setEditUploadMethod] = useState(item.upload_method || 'BROWSER_AUTO');
    const [editSourceExternalId, setEditSourceExternalId] = useState(item.source_external_id || '');
    const [editApprovalRequired, setEditApprovalRequired] = useState(Boolean(item.approval_required));

    const [isSaving, setIsSaving] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // 실시간 바이럴 변환 미리보기 (Instant 0ms 계산)
    const tiktokPreview = useMemo(() => {
        return computeViralPreview('tiktok', editTitle, editDescription, editHashtags, editTiktokCaption);
    }, [editTitle, editDescription, editHashtags, editTiktokCaption]);

    const instagramPreview = useMemo(() => {
        return computeViralPreview('instagram', editTitle, editDescription, editHashtags, editInstagramCaption);
    }, [editTitle, editDescription, editHashtags, editInstagramCaption]);

    const youtubePreview = useMemo(() => {
        return computeViralPreview('youtube', editTitle, editDescription, editHashtags);
    }, [editTitle, editDescription, editHashtags]);

    // 이전 item.id 추적용 Ref (백그라운드 10초 폴링 시 사용자 편집 상태가 리셋되는 치명적 버그 방지)
    const prevItemIdRef = useRef(item.id);

    useEffect(() => {
        // item의 ID가 실제로 달라졌을 때만 (다른 카드를 클릭/교체했을 때) 전체 상태를 동기화
        if (prevItemIdRef.current !== item.id) {
            prevItemIdRef.current = item.id;
            setEditVideoFilePath(item.video_file_path || '');
            setEditTitle(item.title || '');
            setEditDescription(item.description || '');
            setEditHashtags(Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || ''));
            setEditTags(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''));

            const plats = Array.isArray(item.target_platforms) && item.target_platforms.length > 0
                ? item.target_platforms.filter((p: string) => p !== 'douyin')
                : ['youtube'];
            setEditTargetPlatforms(plats);
            setActivePlatformTab(plats[0] as any || 'youtube');

            const ytConf = item.platform_configs?.youtube || {};
            setEditChannelId(ytConf.channel_id || item.channel_id || '');
            setEditPrivacy(ytConf.privacy || (item.scheduled_upload_time ? 'scheduled' : 'private'));
            setEditScheduleTime(
                item.scheduled_upload_time
                    ? (item.scheduled_upload_time.includes('T') ? item.scheduled_upload_time : item.scheduled_upload_time.replace(' ', 'T')).slice(0, 16)
                    : ''
            );
            const pcSync = item.platform_configs || {};
            const itemHeadless = pcSync.headless_mode ?? pcSync.tiktok?.headless_mode ?? pcSync.instagram?.headless_mode ?? pcSync.youtube?.headless_mode;
            setEditHeadlessMode(
                itemHeadless !== undefined ? !itemHeadless : (typeof window !== 'undefined' ? localStorage.getItem('vl_work_queue_browser_visible') === 'true' : false)
            );
            setEditEnableShoppingTag(Boolean(item.enable_shopping_tag));
            setEditShoppingTagKeyword(item.shopping_tag_keyword || '');

            const ttConf = item.platform_configs?.tiktok || {};
            setEditTiktokAccountId(ttConf.account_id || '');
            setEditTiktokPrivacy(ttConf.privacy || 'private');
            setEditTiktokAllowComments(ttConf.allow_comments !== undefined ? Boolean(ttConf.allow_comments) : true);
            setEditTiktokAllowDuet(ttConf.allow_duet !== undefined ? Boolean(ttConf.allow_duet) : true);
            setEditTiktokCaption(ttConf.caption || '');

            const igConf = item.platform_configs?.instagram || {};
            setEditInstagramAccountId(igConf.account_id || '');
            setEditInstagramShareToFeed(Boolean(igConf.share_to_feed));
            setEditInstagramCaption(igConf.caption || '');

            setEditUploadMethod(item.upload_method || 'BROWSER_AUTO');
            setEditSourceExternalId(item.source_external_id || '');
            setEditApprovalRequired(Boolean(item.approval_required));
        }
    }, [item.id]);

    const initialPlatStr = (Array.isArray(item.target_platforms) && item.target_platforms.length > 0 ? item.target_platforms.filter((p: string) => p !== 'douyin') : ['youtube']).slice().sort().join(',');
    const currentPlatStr = editTargetPlatforms.slice().sort().join(',');

    const isDirty = (
        editVideoFilePath !== (item.video_file_path || '') ||
        editTitle !== (item.title || '') ||
        editDescription !== (item.description || '') ||
        editHashtags !== (Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || '')) ||
        editTags !== (Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '')) ||
        currentPlatStr !== initialPlatStr ||
        editChannelId !== (item.platform_configs?.youtube?.channel_id || item.channel_id || '') ||
        editPrivacy !== (item.platform_configs?.youtube?.privacy || (item.scheduled_upload_time ? 'scheduled' : 'private')) ||
        (editPrivacy === 'scheduled' && editScheduleTime !== (item.scheduled_upload_time ? (item.scheduled_upload_time.includes('T') ? item.scheduled_upload_time : item.scheduled_upload_time.replace(' ', 'T')).slice(0, 16) : '')) ||
        editHeadlessMode !== (
            (item.platform_configs?.headless_mode ?? item.platform_configs?.tiktok?.headless_mode ?? item.platform_configs?.instagram?.headless_mode ?? item.platform_configs?.youtube?.headless_mode) !== undefined
                ? !(item.platform_configs?.headless_mode ?? item.platform_configs?.tiktok?.headless_mode ?? item.platform_configs?.instagram?.headless_mode ?? item.platform_configs?.youtube?.headless_mode)
                : false
        ) ||
        editEnableShoppingTag !== Boolean(item.enable_shopping_tag) ||
        editShoppingTagKeyword !== (item.shopping_tag_keyword || '') ||
        editTiktokAccountId !== (item.platform_configs?.tiktok?.account_id || '') ||
        editTiktokPrivacy !== (item.platform_configs?.tiktok?.privacy || 'private') ||
        editTiktokAllowComments !== (item.platform_configs?.tiktok?.allow_comments !== undefined ? Boolean(item.platform_configs.tiktok.allow_comments) : true) ||
        editTiktokAllowDuet !== (item.platform_configs?.tiktok?.allow_duet !== undefined ? Boolean(item.platform_configs.tiktok.allow_duet) : true) ||
        editTiktokCaption !== (item.platform_configs?.tiktok?.caption || '') ||
        editInstagramAccountId !== (item.platform_configs?.instagram?.account_id || '') ||
        editInstagramShareToFeed !== Boolean(item.platform_configs?.instagram?.share_to_feed) ||
        editInstagramCaption !== (item.platform_configs?.instagram?.caption || '') ||
        editUploadMethod !== (item.upload_method || 'BROWSER_AUTO') ||
        editSourceExternalId !== (item.source_external_id || '') ||
        editApprovalRequired !== Boolean(item.approval_required)
    );

    const handleRevert = () => {
        setEditVideoFilePath(item.video_file_path || '');
        setEditTitle(item.title || '');
        setEditDescription(item.description || '');
        setEditHashtags(Array.isArray(item.hashtags) ? item.hashtags.join(' ') : (item.hashtags || ''));
        setEditTags(Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''));

        const plats = Array.isArray(item.target_platforms) && item.target_platforms.length > 0
            ? item.target_platforms
            : ['youtube'];
        setEditTargetPlatforms(plats);
        setActivePlatformTab(plats.includes(activePlatformTab) ? activePlatformTab : (plats[0] as any || 'youtube'));

        const ytConf = item.platform_configs?.youtube || {};
        setEditChannelId(ytConf.channel_id || item.channel_id || '');
        setEditPrivacy(ytConf.privacy || (item.scheduled_upload_time ? 'scheduled' : 'private'));
        setEditScheduleTime(
            item.scheduled_upload_time
                ? (item.scheduled_upload_time.includes('T') ? item.scheduled_upload_time : item.scheduled_upload_time.replace(' ', 'T')).slice(0, 16)
                : ''
        );
        const pcRev = item.platform_configs || {};
        const revHeadless = pcRev.headless_mode ?? pcRev.tiktok?.headless_mode ?? pcRev.instagram?.headless_mode ?? pcRev.youtube?.headless_mode;
        setEditHeadlessMode(
            revHeadless !== undefined ? !revHeadless : false
        );
        setEditEnableShoppingTag(Boolean(item.enable_shopping_tag));
        setEditShoppingTagKeyword(item.shopping_tag_keyword || '');

        const ttConf = item.platform_configs?.tiktok || {};
        setEditTiktokAccountId(ttConf.account_id || '');
        setEditTiktokPrivacy(ttConf.privacy || 'private');
        setEditTiktokAllowComments(ttConf.allow_comments !== undefined ? Boolean(ttConf.allow_comments) : true);
        setEditTiktokAllowDuet(ttConf.allow_duet !== undefined ? Boolean(ttConf.allow_duet) : true);
        setEditTiktokCaption(ttConf.caption || '');

        const igConf = item.platform_configs?.instagram || {};
        setEditInstagramAccountId(igConf.account_id || '');
        setEditInstagramShareToFeed(Boolean(igConf.share_to_feed));
        setEditInstagramCaption(igConf.caption || '');

        setEditUploadMethod(item.upload_method || 'BROWSER_AUTO');
        setEditSourceExternalId(item.source_external_id || '');
        setEditApprovalRequired(Boolean(item.approval_required));
        toast({ title: "변경사항 복원", description: "원래 데이터로 되돌렸습니다." });
    };

    const togglePlatform = (p: string) => {
        let updated: string[];
        if (editTargetPlatforms.includes(p)) {
            if (editTargetPlatforms.length <= 1) {
                toast({ variant: "destructive", title: "최소 1개 플랫폼 필수", description: "적어도 하나의 배포 플랫폼이 선택되어 있어야 합니다." });
                return;
            }
            updated = editTargetPlatforms.filter(x => x !== p);
            if (activePlatformTab === p) {
                setActivePlatformTab(updated[0] as any || 'youtube');
            }
        } else {
            updated = [...editTargetPlatforms, p];
            setActivePlatformTab(p as any);
        }
        setEditTargetPlatforms(updated);
    };

    const handleSelectOfficialExport = (filePath: string) => {
        if (!filePath) return;
        setEditVideoFilePath(filePath);
        if (!editTitle.trim()) {
            const fileName = filePath.split(/[/\\]/).pop() || '';
            setEditTitle(fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
        }
        toast({ title: "공식 저장소 영상 선택", description: filePath.split(/[/\\]/).pop() });
    };

    const handleBrowseVideo = () => {
        if ((window as any).electronAPI?.selectVideoFile) {
            (window as any).electronAPI.selectVideoFile().then((r: any) => {
                if (r?.success && r?.path) {
                    setEditVideoFilePath(r.path);
                    if (!editTitle.trim()) {
                        const fileName = r.path.split(/[/\\]/).pop() || '';
                        setEditTitle(fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
                    }
                    toast({ title: "영상 파일 선택 완료", description: r.path });
                }
            }).catch((err: any) => {
                console.error("Electron video file selection error:", err);
            });
            return;
        }
        // 웹 브라우저 환경: User Activation 보존을 위해 즉시 동기 실행
        fileInputRef.current?.click();
    };

    const uploadFileDirect = async (file: File) => {
        setIsUploadingVideo(true);
        setUploadPercent(0);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/work-queue/items/${item.id}/upload-attach`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadPercent(percent);
                }
            };

            const uploadPromise = new Promise<any>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
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

            const newPath = data.video_file_path || data.server_file_path || '';
            if (newPath) {
                setEditVideoFilePath(newPath);
            }
            if (!editTitle.trim()) {
                setEditTitle(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
            }
            toast({ title: "영상 업로드 완료", description: `서버에 저장되어 연결되었습니다: ${file.name}` });
            if (typeof onRefresh === 'function') {
                onRefresh();
            } else if (typeof onUpdateItem === 'function') {
                onUpdateItem(item.id, { video_file_path: newPath });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "업로드 실패", description: err.message || '서버 오류' });
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFileDirect(file);
        if (e.target) e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDraggingOver) setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDraggingOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        const file = files[0];

        // 비디오 확장자 검사
        const validVideoExts = /\.(mp4|mov|webm|mkv|avi|m4v|flv|wmv)$/i;
        const isVideo = file.type.startsWith('video/') || validVideoExts.test(file.name);
        if (!isVideo) {
            toast({
                variant: "destructive",
                title: "동영상 파일이 아닙니다",
                description: "MP4, MOV, WEBM 등 비디오 파일을 끌어다 놓아주세요."
            });
            return;
        }

        // 1) Electron 환경: file.path 존재 시 0초 로컬 파일 직결
        const electronFilePath = (file as any).path;
        if (electronFilePath) {
            setEditVideoFilePath(electronFilePath);
            if (!editTitle.trim()) {
                const fileName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                setEditTitle(fileName);
            }
            toast({
                title: "🎬 동영상 연결 완료 (드래그앤드롭)",
                description: file.name
            });
            if (typeof onRefresh === 'function') {
                onRefresh();
            } else if (typeof onUpdateItem === 'function') {
                onUpdateItem(item.id, { video_file_path: electronFilePath });
            }
            return;
        }

        // 2) 브라우저(Web) 환경: XHR 업로드 실행
        await uploadFileDirect(file);
    };

    const handleExtractShoppingKeyword = async () => {
        if (!editTitle.trim()) return;
        setIsExtractingShoppingKeyword(true);
        try {
            const r = await fetchWithRetry('/api/work-queue/extract-shopping-keyword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle, description: editDescription })
            });
            const d = await r.json();
            if (d.keyword) {
                setEditShoppingTagKeyword(d.keyword);
                toast({ title: "AI 키워드 추출 완료", description: `추출된 상품 태그: ${d.keyword}` });
            }
        } catch (_) {
            toast({ variant: "destructive", title: "키워드 추출 실패", description: "AI 서비스 응답 실패" });
        } finally {
            setIsExtractingShoppingKeyword(false);
        }
    };

    const handleCleanAndSeparateHashtags = () => {
        if (!editDescription) return;
        const matches = editDescription.match(/#[A-Za-z0-9가-힣_]+/g) || [];
        const lines = editDescription.trim().split('\n');
        while (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim();
            if (!lastLine) {
                lines.pop();
                continue;
            }
            const tokens = lastLine.split(/\s+/);
            if (tokens.every((t: string) => t.startsWith('#'))) {
                lines.pop();
            } else {
                lines[lines.length - 1] = lastLine.replace(/(?:\s*#[A-Za-z0-9가-힣_]+)+$/, '').trim();
                break;
            }
        }
        const cleanedDesc = lines.join('\n').trim();

        const existingTags = editHashtags.split(/\s+/).filter(Boolean);
        const allTags = [...matches, ...existingTags];
        const seen = new Set<string>();
        const uniqueTags: string[] = [];
        let shortsTag: string | null = null;

        for (const t of allTags) {
            const tag = t.startsWith('#') ? t : `#${t}`;
            const lower = tag.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                if (lower === '#shorts' || lower === '#쇼츠') {
                    shortsTag = tag;
                } else {
                    uniqueTags.push(tag);
                }
            }
        }
        if (shortsTag) {
            uniqueTags.unshift(shortsTag);
        }

        setEditDescription(cleanedDesc);
        setEditHashtags(uniqueTags.join(' '));
        toast({
            title: "해시태그 분리 및 정리 완료",
            description: `본문에서 해시태그를 분리하여 [해시태그] 칸에 통합했습니다. (${uniqueTags.length}개)`
        });
    };

    const buildPayload = () => {
        const parsedHashtags = editHashtags
            .split(/[\s,]+/)
            .map((t: string) => t.trim())
            .filter(Boolean)
            .map((t: string) => t.startsWith('#') ? t : `#${t}`);

        const parsedTags = editTags
            .split(',')
            .map((t: string) => t.trim().replace(/^#+/, ''))
            .filter(Boolean);

        const configs: any = {
            ...(item.platform_configs || {}),
            headless_mode: !editHeadlessMode,
            youtube: {
                ...((item.platform_configs || {}).youtube || {}),
                channel_id: editChannelId,
                privacy: editPrivacy,
                headless_mode: !editHeadlessMode
            },
            tiktok: {
                ...((item.platform_configs || {}).tiktok || {}),
                account_id: editTiktokAccountId,
                privacy: editTiktokPrivacy,
                allow_comments: editTiktokAllowComments,
                allow_duet: editTiktokAllowDuet,
                caption: editTiktokCaption,
                headless_mode: !editHeadlessMode
            },
            instagram: {
                ...((item.platform_configs || {}).instagram || {}),
                account_id: editInstagramAccountId,
                share_to_feed: editInstagramShareToFeed,
                caption: editInstagramCaption,
                headless_mode: !editHeadlessMode
            }
        };

        const payload: any = {
            title: editTitle,
            description: editDescription,
            hashtags: parsedHashtags,
            tags: parsedTags,
            video_file_path: editVideoFilePath,
            target_platforms: editTargetPlatforms,
            platform_configs: configs,
            channel_id: editChannelId || null,
            upload_method: editUploadMethod,
            source_external_id: editSourceExternalId,
            approval_required: editApprovalRequired,
            enable_shopping_tag: editEnableShoppingTag,
            shopping_tag_keyword: editShoppingTagKeyword,
            scheduled_upload_time: (editPrivacy === 'scheduled' && editScheduleTime)
                ? (editScheduleTime.includes('T') ? editScheduleTime : editScheduleTime.replace(' ', 'T'))
                : (editPrivacy !== 'scheduled' ? null : (item.scheduled_upload_time || null))
        };
        return payload;
    };

    const handleSaveInline = async () => {
        if (!editTitle.trim()) {
            toast({ variant: "destructive", title: "제목 필수", description: "영상 제목을 입력해 주세요." });
            return;
        }
        setIsSaving(true);
        try {
            const payload = buildPayload();
            const res = await fetchWithRetry(`/api/work-queue/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "저장 실패");
            }

            toast({
                title: "변경사항 저장 완료",
                description: `작업 #${item.id}의 정보가 안전하게 업데이트되었습니다.`
            });

            if (typeof onRefresh === 'function') {
                onRefresh();
            } else if (typeof onUpdateItem === 'function') {
                onUpdateItem(item.id, payload);
            }
        } catch (e: any) {
            toast({
                title: "저장 실패",
                description: e.message || "항목 저장 중 오류가 발생했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAndFinalizeInline = async () => {
        if (!editTitle.trim()) {
            toast({ variant: "destructive", title: "제목 필수", description: "영상 제목을 입력해 주세요." });
            return;
        }
        if (!editVideoFilePath.trim()) {
            toast({ variant: "destructive", title: "영상 파일 필요", description: "대기열 등록을 위해 영상을 선택하거나 첨부해 주세요." });
            return;
        }
        if (editTargetPlatforms.includes('youtube') && !editChannelId) {
            toast({ variant: "destructive", title: "채널 선택 필요", description: "YouTube 업로드 채널을 지정해 주세요." });
            return;
        }

        setIsFinalizing(true);
        try {
            const payload = buildPayload();
            // 1. 메타데이터 저장
            const res1 = await fetchWithRetry(`/api/work-queue/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res1.ok) {
                const err = await res1.json().catch(() => ({}));
                throw new Error(err.detail || "메타데이터 저장 실패");
            }

            // 2. 대기열 즉시 등록 (finalize)
            const res2 = await fetchWithRetry(`/api/work-queue/items/${item.id}/finalize`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approval_required: false,
                    upload_method: editUploadMethod,
                    target_platforms: editTargetPlatforms,
                    scheduled_upload_time: payload.scheduled_upload_time
                })
            });
            if (!res2.ok) {
                const err = await res2.json().catch(() => ({}));
                throw new Error(err.detail || "대기열 등록 실패");
            }

            const f2 = await res2.json();
            toast({
                title: "대기열 등록 완료",
                description: f2.upload_queued ? "대기열 등록 및 백그라운드 자동 업로드가 시작되었습니다." : "대기열에 등록되었습니다."
            });

            if (typeof onRefresh === 'function') {
                onRefresh();
            } else if (typeof onUpdateItem === 'function') {
                onUpdateItem(item.id, { ...payload, status: f2.status || 'QUEUED', approval_status: 'AUTO_APPROVED' });
            }
        } catch (e: any) {
            toast({
                title: "대기열 등록 실패",
                description: e.message || "처리 중 오류가 발생했습니다.",
                variant: "destructive"
            });
        } finally {
            setIsFinalizing(false);
        }
    };

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
        const configs = item.platform_configs || {};
        const ytChanId = configs.youtube?.channel_id || item.channel_id;
        const ytChan = channels.find((c: any) => c.channel_id === ytChanId);

        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {(!plats.length || plats.includes('youtube')) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">
                        🎬 YT: {ytChan?.channel_name || ytChan?.title || ytChanId || '채널 미선택'}
                        {renderChannelNetworkBadge(ytChan)}
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

    const streamUrl = getStreamUrl(editVideoFilePath || item.video_file_path);
    const hasVideo = !!(editVideoFilePath || item.video_file_path);

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
                <div className="flex items-center justify-between w-full sm:hidden border-b border-border/40 pb-1.5" onClick={(e) => e.stopPropagation()}>
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

                    <div className="flex items-center gap-1">
                        <Button 
                            size="sm" 
                            variant={expanded ? "secondary" : "outline"} 
                            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
                            className="h-7 text-xs px-2 gap-1 font-medium border-border"
                        >
                            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <Edit className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                            <span>{expanded ? '닫기' : '수정'}</span>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* 2. 본문 컨텐츠 행 (빈 공간 클릭 시에도 펼쳐지도록 전체 클릭 가능) */}
                <div 
                    onClick={() => setExpanded(!expanded)} 
                    className="flex items-start sm:items-center gap-2.5 sm:gap-3 w-full min-w-0 cursor-pointer rounded-lg p-1 -m-1 transition-colors hover:bg-muted/40"
                    title={expanded ? "클릭하여 인라인 편집 작업대 닫기" : "클릭하여 인라인 편집 작업대 열기"}
                >
                    {/* 데스크톱 전용 체크박스 & 순번 & 상태 배지 */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
                        className="w-12 h-12 rounded-lg bg-muted/80 border border-border shrink-0 overflow-hidden flex items-center justify-center relative group shadow-2xs"
                    >
                        {hasVideo || item.thumbnail_url || item.thumbnail_path ? (
                            <>
                                <img 
                                    src={item.thumbnail_url || getThumbnailUrl(item.video_file_path, item.thumbnail_path)} 
                                    alt="" 
                                    loading="lazy"
                                    className="w-full h-full object-cover" 
                                    onError={(e) => {
                                        (e.target as HTMLElement).style.opacity = '0';
                                    }}
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
                            <h4 className="font-semibold text-xs sm:text-sm text-foreground truncate hover:text-indigo-600 max-w-full sm:max-w-md">
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
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                                    <Play className="w-3 h-3" /> 영상 연결됨
                                </span>
                            ) : (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                                    <FileVideo className="w-3 h-3" /> 영상 미첨부
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 데스크톱 전용 우측 액션 버튼 바 */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-auto" onClick={(e) => e.stopPropagation()}>
                        {(item.status === 'DRAFT' || !item.video_file_path) && (
                            <>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                        setExpanded(true);
                                        onAttach(item.id);
                                    }} 
                                    disabled={isUploadingAttach} 
                                    className="h-7 text-xs px-2 border-border"
                                >
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
                        {onReset && (item.status === 'COMPLETED' || item.status === 'FAILED' || item.status === 'QUEUED' || item.approval_status === 'APPROVED') && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => onReset(item.id)} 
                                className="h-7 text-xs px-2.5 border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                                title="대기열 대기 상태로 초기화하여 재승인/재업로드 가능하도록 되돌립니다"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> 초기화
                            </Button>
                        )}
                        <Button 
                            size="sm" 
                            variant={expanded ? "secondary" : "outline"} 
                            onClick={() => setExpanded(!expanded)} 
                            className={`h-7 text-xs px-2.5 gap-1.5 font-medium border-border transition-all ${
                                expanded ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-xs' : 'text-foreground hover:border-indigo-400'
                            }`}
                            title="인라인 편집 작업대 열기/닫기"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>편집 닫기</span>
                                </>
                            ) : (
                                <>
                                    <Edit className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>수정 / 상세</span>
                                </>
                            )}
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40" title="삭제">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                {/* 3. 모바일 전용 하단 주요 액션 버튼 바 */}
                <div className="sm:hidden flex items-center gap-1.5 w-full pt-1.5 border-t border-border/40 justify-end" onClick={(e) => e.stopPropagation()}>
                    {(item.status === 'DRAFT' || !item.video_file_path) && (
                        <>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                    setExpanded(true);
                                    onAttach(item.id);
                                }} 
                                disabled={isUploadingAttach} 
                                className="h-7 text-xs px-2.5 border-border flex-1"
                            >
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
                    {onReset && (item.status === 'COMPLETED' || item.status === 'FAILED' || item.status === 'QUEUED' || item.approval_status === 'APPROVED') && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onReset(item.id)} 
                            className="h-7 text-xs px-2 border-border flex-1"
                            title="대기열 대기 상태로 초기화"
                        >
                            <RotateCcw className="w-3 h-3 mr-1" /> 초기화
                        </Button>
                    )}
                </div>

                {/* 4. 인라인 원클릭 즉시 편집 스튜디오 (멀티 플랫폼 & 영상 관리 완벽 흡수) */}
                {expanded && (
                    <div className="mt-3 pt-3 border-t border-border/80 space-y-3 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col md:flex-row items-stretch gap-4 text-xs w-full min-w-0">
                            
                            {/* [좌측] 📱 9:16 모바일 폰 숏폼 프리뷰어 & 🎬 영상 통합 드롭존 (폭 320px~340px) */}
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`w-full md:w-[320px] lg:w-[340px] shrink-0 flex flex-col p-3 rounded-2xl border transition-all duration-200 space-y-2.5 shadow-xs ${
                                    isDraggingOver 
                                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-2 ring-indigo-500/50' 
                                        : 'border-border bg-muted/30'
                                }`}
                            >
                                <div className="w-full flex items-center justify-between text-[11px] font-bold text-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Play className="w-3.5 h-3.5 text-indigo-500" /> 숏폼 뷰 (9:16)
                                    </span>
                                    {hasVideo && (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-5 text-[10px] px-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 gap-1 font-medium" 
                                            onClick={() => handleOpenInSystem(editVideoFilePath || item.video_file_path)}
                                            title="시스템 기본 플레이어로 열기"
                                        >
                                            <ExternalLink className="w-3 h-3" /> 열기 ↗
                                        </Button>
                                    )}
                                </div>

                                {/* 9:16 비디오 플레이어 프레임 */}
                                {hasVideo || item.thumbnail_url ? (
                                    <div 
                                        onClick={togglePlayPause}
                                        className="relative w-full aspect-[9/16] min-h-[380px] max-h-[480px] rounded-xl overflow-hidden bg-black border border-border shadow-md group cursor-pointer flex items-center justify-center mx-auto select-none"
                                    >
                                        <video 
                                            ref={videoRef}
                                            key={editVideoFilePath || item.video_file_path}
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
                                        {!isPlaying && !isDraggingOver && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                                                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-lg">
                                                    <Play className="w-6 h-6 ml-0.5 fill-white" />
                                                </div>
                                            </div>
                                        )}

                                        {/* 드래그 오버 시 영상 교체 안내 오버레이 */}
                                        {isDraggingOver && (
                                            <div className="absolute inset-0 bg-indigo-600/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30 p-4 text-center animate-in fade-in duration-150">
                                                <UploadCloud className="w-12 h-12 mb-2 animate-bounce" />
                                                <p className="font-bold text-sm">새 동영상 파일 놓기</p>
                                                <p className="text-[11px] text-indigo-100 mt-1">여기에 놓으면 즉시 이 영상으로 교체됩니다</p>
                                            </div>
                                        )}

                                        {/* 우하단 음소거 토글 버튼 */}
                                        <button
                                            type="button"
                                            onClick={toggleMute}
                                            className="absolute bottom-2.5 right-2.5 p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-xs transition-all z-10 shadow"
                                            title={isMuted ? "소리 켜기" : "음소거"}
                                        >
                                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                                        </button>

                                        {/* 상단 숏폼 해상도/길이 배지 */}
                                        {videoInfo && (
                                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-[9px] font-mono text-white/90 px-1.5 py-0.5 rounded shadow-xs">
                                                {videoInfo.width}×{videoInfo.height} {videoInfo.duration > 0 && `· ${formatDuration(videoInfo.duration)}`}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={handleBrowseVideo}
                                        className={`w-full aspect-[9/16] min-h-[380px] max-h-[480px] rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-5 text-center cursor-pointer relative group ${
                                            isDraggingOver 
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                                                : 'border-border/80 bg-background/50 hover:border-indigo-400 hover:bg-accent/40'
                                        }`}
                                    >
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                                            {isDraggingOver ? (
                                                <UploadCloud className="w-8 h-8 animate-bounce" />
                                            ) : (
                                                <FileVideo className="w-8 h-8" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-foreground mb-1">
                                            {isDraggingOver ? "✨ 여기에 동영상을 놓아주세요" : "동영상 끌어다 놓기 (Drag & Drop)"}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[210px]">
                                            PC 탐색기에서 비디오 파일을 마우스로 끌어오거나 클릭하여 첨부
                                        </p>
                                        <div className="mt-3 px-3 py-1.5 rounded-full bg-background border border-border text-[11px] text-indigo-600 dark:text-indigo-400 font-medium shadow-2xs group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 flex items-center gap-1">
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            <span>영상 파일 찾아보기</span>
                                        </div>

                                        {isUploadingVideo && (
                                            <div className="absolute inset-0 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                                <p className="text-xs font-bold text-foreground">영상 업로드 중...</p>
                                                <p className="text-[10px] text-muted-foreground font-mono mt-1">{uploadPercent}%</p>
                                                <div className="w-36 bg-muted rounded-full h-1.5 overflow-hidden mt-2">
                                                    <div className="bg-primary h-full transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 영상 소스 관리 (05_Exports & 통합 컨트롤 허브) */}
                                <div className="pt-2 border-t border-border/60 space-y-2 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                            <Film className="w-3.5 h-3.5 text-indigo-500" /> 영상 파일 소스
                                        </span>
                                        {onRefreshOfficialExports && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={onRefreshOfficialExports}
                                                disabled={isLoadingExports}
                                                className="h-5 text-[10px] px-1 text-muted-foreground hover:text-foreground"
                                                title="05_Exports 폴더 새로고침"
                                            >
                                                <RefreshCw className={`w-2.5 h-2.5 mr-1 ${isLoadingExports ? 'animate-spin' : ''}`} /> 새로고침
                                            </Button>
                                        )}
                                    </div>

                                    {/* 05_Exports 드롭다운 */}
                                    <Select
                                        value={editVideoFilePath || ''}
                                        onValueChange={handleSelectOfficialExport}
                                    >
                                        <SelectTrigger className="h-8 text-[11px] bg-background border-border">
                                            <SelectValue placeholder={isLoadingExports ? "스캔 중..." : (officialExports.length ? `📁 05_Exports (${officialExports.length}개 영상)` : "05_Exports 폴더 비어있음")} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-52">
                                            {officialExports.map((file: any) => (
                                                <SelectItem key={file.path} value={file.path}>
                                                    <div className="flex items-center justify-between gap-2 text-[11px] w-full">
                                                        <span className="font-medium truncate max-w-[170px]">{file.filename}</span>
                                                        <span className="text-[10px] text-muted-foreground shrink-0">{file.size_mb}MB</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* 파일 연결 상태 툴바 및 직접 찾아보기 */}
                                    {hasVideo ? (
                                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background border border-border">
                                            <Film className="w-3.5 h-3.5 text-indigo-500 shrink-0 ml-1" />
                                            <span 
                                                className="font-mono text-[10px] text-foreground truncate flex-1 cursor-pointer hover:underline" 
                                                title={`전체 경로: ${editVideoFilePath || item.video_file_path}`}
                                                onClick={() => copyText(editVideoFilePath || item.video_file_path, '전체 경로가 복사되었습니다')}
                                            >
                                                {(editVideoFilePath || item.video_file_path).split(/[/\\]/).pop()}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyText(editVideoFilePath || item.video_file_path, '경로 복사됨')}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                                                title="경로 복사"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleBrowseVideo}
                                                disabled={isUploadingVideo}
                                                className="h-6 px-1.5 text-[10px] shrink-0 border-border"
                                                title="다른 동영상으로 변경"
                                            >
                                                {isUploadingVideo ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <FolderOpen className="w-3 h-3 text-indigo-500" />}
                                                <span className="ml-1">{isUploadingVideo ? `${uploadPercent}%` : '변경'}</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1.5">
                                            <Input 
                                                value={editVideoFilePath}
                                                onChange={e => setEditVideoFilePath(e.target.value)}
                                                placeholder="파일 경로 직접 입력..."
                                                className="h-8 text-[10px] font-mono bg-background border-border flex-1 px-2"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleBrowseVideo}
                                                disabled={isUploadingVideo}
                                                className="h-8 text-[11px] px-2.5 shrink-0 border-border font-medium"
                                            >
                                                {isUploadingVideo ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />}
                                                <span className="ml-1">{isUploadingVideo ? `${uploadPercent}%` : '찾기'}</span>
                                            </Button>
                                        </div>
                                    )}

                                    <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

                                    {isUploadingVideo && (
                                        <div className="space-y-0.5">
                                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                                                <div className="bg-primary h-1 rounded-full transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
                                            </div>
                                            <p className="text-[9px] text-muted-foreground text-right">업로드 중... {uploadPercent}%</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* [우측] 📝 콘텐츠 메타 편집 (7칸) + 🚀 멀티 플랫폼 배포 거버넌스 (5칸) */}
                            <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                
                                {/* 1) 콘텐츠 메타데이터 즉시 편집 (7칸) */}
                                <div className="lg:col-span-7 rounded-xl border border-border bg-muted/20 p-3.5 space-y-3 min-w-0 overflow-hidden flex flex-col justify-between shadow-xs">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                                                <FileText className="w-3.5 h-3.5 text-indigo-500" /> 콘텐츠 메타데이터 (인라인 즉시 편집)
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 gap-1" 
                                                    onClick={handleCleanAndSeparateHashtags} 
                                                    title="설명 본문 끝에 달린 해시태그를 분리하여 아래 해시태그 칸으로 정돈합니다"
                                                >
                                                    <Sparkles className="w-3 h-3 text-amber-500" /> 본문/해시태그 분리정리
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 text-[10px] px-1.5" 
                                                    onClick={() => copyText(`${editTitle}\n\n${editDescription}\n\n${editHashtags}`, '전체 메타 복사됨')}
                                                >
                                                    <Copy className="w-2.5 h-2.5 mr-1" /> 복사
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 제목 입력 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground font-semibold">제목 (Title) *</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{editTitle.length}/100자</span>
                                            </div>
                                            <Input 
                                                value={editTitle} 
                                                onChange={(e) => setEditTitle(e.target.value)} 
                                                placeholder="동영상 제목을 입력하세요 (최대 100자)" 
                                                className="text-xs font-semibold h-8 bg-background border-border focus-visible:ring-indigo-500" 
                                                maxLength={100}
                                            />
                                        </div>

                                        {/* 설명 입력 */}
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground font-semibold">설명 본문 (Description)</span>
                                                <span className="text-[9px] text-muted-foreground font-mono">{editDescription.length}자</span>
                                            </div>
                                            <Textarea 
                                                value={editDescription} 
                                                onChange={(e) => setEditDescription(e.target.value)} 
                                                placeholder="동영상 설명글을 입력하세요 (해시태그는 아래 [해시태그] 칸에 적으면 업로드 시 자동으로 맨 밑에 결합됩니다)" 
                                                rows={4} 
                                                className="text-xs leading-relaxed bg-background border-border resize-y focus-visible:ring-indigo-500" 
                                            />
                                        </div>

                                        {/* 해시태그 & 검색 태그 */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                                        <Hash className="w-3 h-3 text-indigo-500" /> 해시태그 (Hashtags)
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground">공백 구분</span>
                                                </div>
                                                <Input 
                                                    value={editHashtags} 
                                                    onChange={(e) => setEditHashtags(e.target.value)} 
                                                    placeholder="#쇼츠 #유머 #바이럴" 
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium h-8 bg-background border-border focus-visible:ring-indigo-500" 
                                                />
                                                <p className="text-[9px] text-muted-foreground/70 leading-tight">
                                                    * 업로드 시 설명글 하단에 중복 없이 결합됩니다.
                                                </p>
                                            </div>
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                                        검색 태그 (Tags 칩)
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground">쉼표(,) 구분</span>
                                                </div>
                                                <Input 
                                                    value={editTags} 
                                                    onChange={(e) => setEditTags(e.target.value)} 
                                                    placeholder="shorts, 유머, 바이럴" 
                                                    className="text-xs h-8 bg-background border-border focus-visible:ring-indigo-500" 
                                                />
                                                <p className="text-[9px] text-muted-foreground/70 leading-tight">
                                                    * YouTube Studio '자세히 표시' 태그 칩으로 등록됩니다.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 2) 배포 플랫폼 및 거버넌스 설정 (5칸) */}
                                <div className="lg:col-span-5 rounded-xl border border-border bg-muted/20 p-3.5 space-y-3 min-w-0 overflow-hidden flex flex-col justify-between shadow-xs">
                                    <div className="space-y-3">
                                        {/* 상단 플랫폼 선택 토글 필 (Pills) */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                    <Rocket className="w-3.5 h-3.5 text-indigo-500" /> 대상 플랫폼 선택
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {editTargetPlatforms.length}개 플랫폼 활성
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-background border border-border">
                                                <button
                                                    type="button"
                                                    onClick={() => togglePlatform('youtube')}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all ${
                                                        editTargetPlatforms.includes('youtube')
                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <span>🎬 YouTube</span>
                                                    {editTargetPlatforms.includes('youtube') && <Check className="w-3 h-3 shrink-0" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePlatform('tiktok')}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all ${
                                                        editTargetPlatforms.includes('tiktok')
                                                            ? 'bg-pink-600 text-white shadow-xs'
                                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <span>🎵 TikTok</span>
                                                    {editTargetPlatforms.includes('tiktok') && <Check className="w-3 h-3 shrink-0" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => togglePlatform('instagram')}
                                                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all ${
                                                        editTargetPlatforms.includes('instagram')
                                                            ? 'bg-purple-600 text-white shadow-xs'
                                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                                    }`}
                                                >
                                                    <span>📸 Insta</span>
                                                    {editTargetPlatforms.includes('instagram') && <Check className="w-3 h-3 shrink-0" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* 활성 플랫폼 서브 탭 전환기 */}
                                        <div className="border-b border-border/80 flex items-center gap-1 pb-1">
                                            {editTargetPlatforms.includes('youtube') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePlatformTab('youtube')}
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                                        activePlatformTab === 'youtube'
                                                            ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    🎬 YouTube 설정
                                                </button>
                                            )}
                                            {editTargetPlatforms.includes('tiktok') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePlatformTab('tiktok')}
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                                        activePlatformTab === 'tiktok'
                                                            ? 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-500/30'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    🎵 TikTok 설정
                                                </button>
                                            )}
                                            {editTargetPlatforms.includes('instagram') && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePlatformTab('instagram')}
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                                                        activePlatformTab === 'instagram'
                                                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    📸 Instagram 설정
                                                </button>
                                            )}
                                        </div>

                                        {/* 탭 1: YouTube 설정 */}
                                        {activePlatformTab === 'youtube' && editTargetPlatforms.includes('youtube') && (
                                            <div className="space-y-2.5 animate-in fade-in duration-150">
                                                {/* YouTube 채널 선택 & 회선 안내 */}
                                                <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 shrink-0">🎬 YouTube 채널 *</span>
                                                        {renderChannelNetworkBadge(channels.find((ch: any) => ch.channel_id === editChannelId))}
                                                    </div>
                                                    <Select
                                                        value={editChannelId || ''}
                                                        onValueChange={(v) => {
                                                            setEditChannelId(v);
                                                            if (onUpdateChannel) onUpdateChannel(item.id, 'youtube', v);
                                                        }}
                                                        disabled={channels.length === 0}
                                                    >
                                                        <SelectTrigger className="h-7 text-[11px] bg-background border-border">
                                                            <SelectValue placeholder={channels.length ? "채널 선택" : "등록된 채널 없음"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                             {channels.map((ch: any) => (
                                                                <SelectItem key={ch.channel_id} value={ch.channel_id}>
                                                                    <div className="flex items-center justify-between gap-2 w-full text-xs">
                                                                        <span className="truncate max-w-[180px]">{ch.channel_name || ch.title} ({ch.subscriber_count?.toLocaleString()}명)</span>
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {ch.auto_approve_default && (
                                                                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">
                                                                                    ⭐ 자동승인
                                                                                </span>
                                                                            )}
                                                                            {renderChannelNetworkBadge(ch)}
                                                                        </div>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>

                                                    {channels.find((ch: any) => ch.channel_id === editChannelId) && (
                                                        <div className="text-[10px] bg-background/80 p-2 rounded-lg border border-border/70 space-y-1">
                                                            <div className="flex items-center justify-between text-muted-foreground">
                                                                <span>소유 계정:</span>
                                                                <span className="font-mono text-foreground font-medium truncate max-w-[150px]">
                                                                    {channels.find((ch: any) => ch.channel_id === editChannelId).profile_email || channels.find((ch: any) => ch.channel_id === editChannelId).account_email || '전용 브라우저 세션'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-muted-foreground">
                                                                <span>독립 회선:</span>
                                                                <span className="font-semibold text-foreground">
                                                                    {channels.find((ch: any) => ch.channel_id === editChannelId).bound_device_serial ? `📱 모바일 LTE (${channels.find((ch: any) => ch.channel_id === editChannelId).bound_device_serial})` :
                                                                     (channels.find((ch: any) => ch.channel_id === editChannelId).proxy_port && channels.find((ch: any) => ch.channel_id === editChannelId).proxy_port >= 1080 && channels.find((ch: any) => ch.channel_id === editChannelId).proxy_port <= 1089) ? `📱 모바일 프록시 (포트 ${channels.find((ch: any) => ch.channel_id === editChannelId).proxy_port})` :
                                                                     channels.find((ch: any) => ch.channel_id === editChannelId).proxy_host ? `🌐 ISP 고정 (${channels.find((ch: any) => ch.channel_id === editChannelId).proxy_host})` : `🛡️ 로컬 단독 회선`}
                                                                </span>
                                                            </div>
                                                            {channels.find((ch: any) => ch.channel_id === editChannelId)?.auto_approve_default && (
                                                                <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/40 p-1.5 rounded border border-blue-200/60 dark:border-blue-800/40 mt-1">
                                                                    <span>⭐ 자동 승인 신뢰 채널</span>
                                                                    <span className="text-[9px] font-normal text-muted-foreground">등록 시 PENDING 검수 없이 대기열로 직결</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 공개 상태 & 스텔스 창 표시 */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">공개 상태</span>
                                                        <Select value={editPrivacy} onValueChange={setEditPrivacy}>
                                                            <SelectTrigger className="h-7 text-xs bg-background border-border mt-0.5">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="private">🔒 비공개 (권장)</SelectItem>
                                                                <SelectItem value="unlisted">🔗 일부 공개 (링크)</SelectItem>
                                                                <SelectItem value="public">🌐 즉시 공개</SelectItem>
                                                                <SelectItem value="scheduled">📅 예약 발행</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex flex-col justify-end">
                                                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-background border border-border">
                                                            <span className="text-[10px] font-medium text-foreground flex items-center gap-1">
                                                                {editHeadlessMode ? <Eye className="w-3 h-3 text-indigo-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                                                창 표시
                                                            </span>
                                                            <Switch checked={editHeadlessMode} onCheckedChange={setEditHeadlessMode} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 예약 일시 */}
                                                {(editPrivacy === 'scheduled' || !!editScheduleTime) && (
                                                    <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 space-y-1">
                                                        <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> 예약 게시 일시 (YouTube Studio 자동 예약)
                                                        </span>
                                                        <Input 
                                                            type="datetime-local" 
                                                            value={editScheduleTime} 
                                                            onChange={(e) => setEditScheduleTime(e.target.value)} 
                                                            className="h-7 text-xs bg-background border-border" 
                                                        />
                                                    </div>
                                                )}

                                                {/* 유튜브 쇼핑 태그 */}
                                                <div className="pt-1.5 border-t border-border/60 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[11px] font-semibold text-foreground">유튜브 쇼핑 제휴 태그</span>
                                                            <p className="text-[9px] text-muted-foreground">업로드 시 수익 제품 자동 태깅</p>
                                                        </div>
                                                        <Switch
                                                            checked={editEnableShoppingTag}
                                                            onCheckedChange={setEditEnableShoppingTag}
                                                        />
                                                    </div>
                                                    {editEnableShoppingTag && (
                                                        <div className="flex gap-1.5 pt-0.5">
                                                            <Input
                                                                value={editShoppingTagKeyword}
                                                                onChange={e => setEditShoppingTagKeyword(e.target.value)}
                                                                placeholder="예: 초경량 무선 청소기, 캠핑 텐트"
                                                                className="h-7 text-xs bg-background border-border flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={handleExtractShoppingKeyword}
                                                                disabled={isExtractingShoppingKeyword || !editTitle.trim()}
                                                                className="h-7 text-[10px] px-2 shrink-0 font-medium"
                                                            >
                                                                {isExtractingShoppingKeyword ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1 text-amber-500" />}
                                                                AI 추출
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* YouTube Shorts 클린 메타데이터 안내 */}
                                                <div className="p-2 rounded-lg border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-blue-500" />
                                                            🎬 YouTube Shorts 클린 메타데이터
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] py-0 bg-blue-100/60 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800">
                                                            #shorts 자동 보장
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground">{youtubePreview.note}</p>
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {youtubePreview.tags.map((t, i) => (
                                                            <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 탭 2: TikTok 설정 */}
                                        {activePlatformTab === 'tiktok' && editTargetPlatforms.includes('tiktok') && (
                                            <div className="space-y-2.5 animate-in fade-in duration-150">
                                                <div className="p-2.5 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-pink-700 dark:text-pink-300">🎵 TikTok 계정 *</span>
                                                        <Badge variant="outline" className="text-[9px] py-0 bg-pink-100/50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-300 dark:border-pink-800">
                                                            {tiktokChannels.length}개 연동됨
                                                        </Badge>
                                                    </div>

                                                    <Select
                                                        value={editTiktokAccountId || ''}
                                                        onValueChange={setEditTiktokAccountId}
                                                        disabled={tiktokChannels.length === 0}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs bg-background border-border">
                                                            <SelectValue placeholder={tiktokChannels.length ? "TikTok 계정 선택" : "연동된 TikTok 계정 없음"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tiktokChannels.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                                        <span className="font-medium">{c.nickname || c.id}</span>
                                                                        {c.account_id && <span className="text-[10px] text-muted-foreground font-mono">@{c.account_id}</span>}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-[10px] text-muted-foreground font-semibold">공개 범위</span>
                                                        <Select value={editTiktokPrivacy} onValueChange={setEditTiktokPrivacy}>
                                                            <SelectTrigger className="h-7 text-xs bg-background border-border mt-0.5">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="private">🔒 비공개 (Private)</SelectItem>
                                                                <SelectItem value="friends_only">👥 친구 공개 (Friends)</SelectItem>
                                                                <SelectItem value="public">🌐 전체 공개 (Public)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex flex-col justify-end">
                                                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-background border border-border">
                                                            <span className="text-[10px] font-medium text-foreground flex items-center gap-1">
                                                                {editHeadlessMode ? <Eye className="w-3 h-3 text-pink-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                                                창 표시
                                                            </span>
                                                            <Switch checked={editHeadlessMode} onCheckedChange={setEditHeadlessMode} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <label className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded-lg bg-background border border-border">
                                                        <span className="text-[10px] font-medium">댓글 허용</span>
                                                        <Switch checked={editTiktokAllowComments} onCheckedChange={setEditTiktokAllowComments} />
                                                    </label>
                                                    <label className="flex items-center justify-between text-xs cursor-pointer p-1.5 rounded-lg bg-background border border-border">
                                                        <span className="text-[10px] font-medium">듀엣/스티치</span>
                                                        <Switch checked={editTiktokAllowDuet} onCheckedChange={setEditTiktokAllowDuet} />
                                                    </label>
                                                </div>

                                                {/* 틱톡 맞춤 캡션 입력 */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-muted-foreground font-semibold">틱톡 맞춤 캡션 (선택)</span>
                                                        <span className="text-[9px] text-muted-foreground">{editTiktokCaption ? '맞춤 캡션 사용' : '비워두면 100% 자동 바이럴'}</span>
                                                    </div>
                                                    <Textarea
                                                        value={editTiktokCaption}
                                                        onChange={e => setEditTiktokCaption(e.target.value)}
                                                        placeholder="비워두면 2줄 훅 캡션과 #fyp #틱톡순삭 태그가 자동 생성됩니다..."
                                                        rows={2}
                                                        className="text-xs bg-background border-border"
                                                    />
                                                </div>

                                                {/* TikTok 자동 바이럴 변환 실시간 미리보기 배너 */}
                                                <div className="p-2.5 rounded-lg border border-pink-200/80 dark:border-pink-900/50 bg-pink-50/40 dark:bg-pink-950/20 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-pink-700 dark:text-pink-300 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-pink-500" />
                                                            {tiktokPreview.isCustom ? '🎵 틱톡 업로드 캡션 (수동 지정)' : '✨ 틱톡 전자동 바이럴 최적화 미리보기'}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] py-0 bg-pink-100/60 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-800">
                                                            {tiktokPreview.isCustom ? '사용자 맞춤' : '전자동 바이럴'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground">{tiktokPreview.note}</p>
                                                    <div className="p-1.5 rounded bg-background/80 border border-border/60 text-[10px] font-sans text-foreground whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                                                        {tiktokPreview.caption}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {tiktokPreview.tags.map((t, i) => (
                                                            <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 탭 3: Instagram 설정 */}
                                        {activePlatformTab === 'instagram' && editTargetPlatforms.includes('instagram') && (
                                            <div className="space-y-2.5 animate-in fade-in duration-150">
                                                <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">📸 Instagram 계정 *</span>
                                                        <Badge variant="outline" className="text-[9px] py-0 bg-purple-100/50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                                                            {instagramChannels.length}개 연동됨
                                                        </Badge>
                                                    </div>

                                                    <Select
                                                        value={editInstagramAccountId || ''}
                                                        onValueChange={setEditInstagramAccountId}
                                                        disabled={instagramChannels.length === 0}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs bg-background border-border">
                                                            <SelectValue placeholder={instagramChannels.length ? "Instagram 계정 선택" : "연동된 Instagram 계정 없음"} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {instagramChannels.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                                        <span className="font-medium">{c.nickname || c.id}</span>
                                                                        {c.account_id && <span className="text-[10px] text-muted-foreground font-mono">@{c.account_id}</span>}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] font-medium text-foreground">피드 동시 게시</span>
                                                            <p className="text-[8px] text-muted-foreground">릴스 외 피드 노출</p>
                                                        </div>
                                                        <Switch checked={editInstagramShareToFeed} onCheckedChange={setEditInstagramShareToFeed} />
                                                    </div>

                                                    <div className="flex items-center justify-between p-2 rounded-lg bg-background border border-border">
                                                        <span className="text-[10px] font-medium text-foreground flex items-center gap-1">
                                                            {editHeadlessMode ? <Eye className="w-3 h-3 text-purple-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                                                            창 표시
                                                        </span>
                                                        <Switch checked={editHeadlessMode} onCheckedChange={setEditHeadlessMode} />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] text-muted-foreground font-semibold">인스타 맞춤 캡션 (선택)</span>
                                                        <span className="text-[9px] text-muted-foreground">비워두면 본문 자동 사용</span>
                                                    </div>
                                                    <Textarea
                                                        value={editInstagramCaption}
                                                        onChange={e => setEditInstagramCaption(e.target.value)}
                                                        placeholder="인스타그램 전용 캡션 (해시태그 포함 가능)..."
                                                        rows={2}
                                                        className="text-xs bg-background border-border"
                                                    />
                                                </div>

                                                {/* Instagram 자동 바이럴 변환 실시간 미리보기 배너 */}
                                                <div className="p-2.5 rounded-lg border border-purple-200/80 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-purple-500" />
                                                            {instagramPreview.isCustom ? '📸 인스타 업로드 캡션 (수동 지정)' : '✨ 인스타 릴스 전자동 바이럴 최적화 미리보기'}
                                                        </span>
                                                        <Badge variant="outline" className="text-[9px] py-0 bg-purple-100/60 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                                                            {instagramPreview.isCustom ? '사용자 맞춤' : '전자동 바이럴'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground">{instagramPreview.note}</p>
                                                    <div className="p-1.5 rounded bg-background/80 border border-border/60 text-[10px] font-sans text-foreground whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
                                                        {instagramPreview.caption}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                                        {instagramPreview.tags.map((t, i) => (
                                                            <span key={i} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                                                                {t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 하단 공통 거버넌스 (업로드 엔진 & 외부 ID) */}
                                        <div className="pt-2 border-t border-border/60 space-y-2">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground font-semibold">업로드 실행 엔진</span>
                                                <Select value={editUploadMethod} onValueChange={setEditUploadMethod}>
                                                    <SelectTrigger className="h-7 text-xs bg-background border-border mt-0.5">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="BROWSER_AUTO">🤖 스텔스 브라우저 자동화 (회선 격리 보호)</SelectItem>
                                                        <SelectItem value="API">⚡ Google Data API (OAuth 직결)</SelectItem>
                                                        <SelectItem value="MANUAL">✍️ 수동 (대기열 기록 및 관리용)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                                                    <span>외부ID:</span>
                                                    <Input
                                                        value={editSourceExternalId}
                                                        onChange={e => setEditSourceExternalId(e.target.value)}
                                                        placeholder="ID/행번호"
                                                        className="h-6 text-[10px] font-mono bg-background border-border w-24 px-1.5"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-1.5 text-[10px] font-medium text-foreground cursor-pointer">
                                                    <Checkbox
                                                        checked={editApprovalRequired}
                                                        onCheckedChange={c => setEditApprovalRequired(Boolean(c))}
                                                    />
                                                    <span>관리자 승인 필요</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 실패 사유 카드 */}
                                    {isFailed && (
                                        <div className="pt-2 border-t border-border/50">
                                            <FailureReasonCard
                                                failureReason={rawFailureReason}
                                                onRetry={onReset ? () => onReset(item.id) : undefined}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* [인라인 작업대 하단 액션 바] */}
                        <div className="pt-2.5 mt-1 border-t border-border flex items-center justify-between gap-2 flex-wrap bg-muted/10 p-2.5 rounded-lg">
                            <div className="flex items-center gap-2">
                                {isDirty ? (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 animate-pulse">
                                        ● 저장되지 않은 변경사항이 있습니다
                                    </Badge>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Check className="w-3 h-3 text-emerald-500" /> 현재 데이터가 DB와 일치합니다
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 ml-auto">
                                {onEdit && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(item)}
                                        className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                                        title="전체 팝업 모달 형태로 열기"
                                    >
                                        <ExternalLink className="w-3 h-3 mr-1" /> 모달로 열기
                                    </Button>
                                )}
                                {isDirty && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleRevert} 
                                        className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        원래대로
                                    </Button>
                                )}
                                <Button 
                                    size="sm" 
                                    onClick={handleSaveInline} 
                                    disabled={isSaving || isFinalizing} 
                                    variant="secondary"
                                    className="h-7 text-xs px-3 border border-border font-medium shadow-2xs gap-1.5"
                                >
                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    <span>{isSaving ? "저장 중..." : "변경사항 저장"}</span>
                                </Button>
                                {(item.status === 'DRAFT' || item.status === 'PENDING') && (
                                    <Button 
                                        size="sm" 
                                        onClick={handleSaveAndFinalizeInline} 
                                        disabled={isSaving || isFinalizing} 
                                        className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs gap-1.5"
                                    >
                                        {isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                        <span>{isFinalizing ? "대기열 등록 중..." : "수정 후 대기열 즉시 등록"}</span>
                                    </Button>
                                )}
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
            if (res.ok) {
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



const AddVideoDialog = ({ isOpen, setIsOpen, onSuccess, initialData, showBrowserWindow = false }: any) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [tiktokChannels, setTiktokChannels] = useState<any[]>([]);
    const [instagramChannels, setInstagramChannels] = useState<any[]>([]);
    const [officialExports, setOfficialExports] = useState<any[]>([]);
    const [isLoadingExports, setIsLoadingExports] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);

    const defaultForm = {
        title: '',
        description: '',
        hashtags: '',
        tags: '',
        video_file_path: '',
        source_external_id: '',
        enable_shopping_tag: false,
        shopping_tag_keyword: '',
        source_type: 'MANUAL',
        approval_required: false,
        upload_method: 'BROWSER_AUTO',
        target_platforms: ['youtube'],
        platform_configs: {
            headless_mode: !showBrowserWindow,
            youtube: { channel_id: '', privacy: 'private', category: '22', made_for_kids: false, headless_mode: !showBrowserWindow },
            tiktok: { account_id: '', privacy: 'private', allow_comments: true, allow_duet: true, headless_mode: !showBrowserWindow },
            instagram: { account_id: '', caption: '', share_to_feed: false, headless_mode: !showBrowserWindow }
        },
        scheduleMode: 'immediate' as 'immediate' | 'scheduled',
        scheduledTime: ''
    };
    const [form, setForm] = useState(defaultForm);

    const loadOfficialExports = async () => {
        setIsLoadingExports(true);
        try {
            const res = await fetchWithRetry('/api/work-queue/official-exports');
            if (res.ok) {
                const data = await res.json();
                setOfficialExports(Array.isArray(data.files) ? data.files : []);
            }
        } catch (_) {
            setOfficialExports([]);
        } finally {
            setIsLoadingExports(false);
        }
    };

    const loadSocialChannels = async () => {
        try {
            const [r1, r2] = await Promise.all([
                fetchWithRetry('/api/tiktok-channels/'),
                fetchWithRetry('/api/instagram-channels/')
            ]);
            if (r1.ok) setTiktokChannels(await r1.json());
            if (r2.ok) setInstagramChannels(await r2.json());
        } catch (_) { }
    };

    const loadChannels = async (initialChanId?: string) => {
        try {
            const r = await fetchWithRetry('/api/youtube/all');
            if (!r.ok) throw new Error();
            const data = await r.json();
            const chanList = Array.isArray(data) ? data : [];
            setChannels(chanList);
            if (!initialChanId && chanList.length > 0) {
                setForm(prev => {
                    if (!prev.platform_configs?.youtube?.channel_id) {
                        return {
                            ...prev,
                            platform_configs: {
                                ...prev.platform_configs,
                                youtube: { ...(prev.platform_configs?.youtube || {}), channel_id: chanList[0].channel_id }
                            }
                        };
                    }
                    return prev;
                });
            }
        } catch (_) { setChannels([]); }
    };

    useEffect(() => {
        if (isOpen) {
            loadOfficialExports();
            loadSocialChannels();

            if (initialData) {
                const pc = initialData.platform_configs || {};
                const ytChanId = pc.youtube?.channel_id || initialData.channel_id || '';
                const defaultHeadless = !showBrowserWindow;
                const rootHeadless = pc.headless_mode !== undefined ? pc.headless_mode : defaultHeadless;
                const ytHeadless = pc.youtube?.headless_mode !== undefined ? pc.youtube.headless_mode : rootHeadless;
                const ttHeadless = pc.tiktok?.headless_mode !== undefined ? pc.tiktok.headless_mode : rootHeadless;
                const igHeadless = pc.instagram?.headless_mode !== undefined ? pc.instagram.headless_mode : rootHeadless;
                const mergedConfigs = {
                    headless_mode: rootHeadless,
                    youtube: { ...defaultForm.platform_configs.youtube, ...(pc.youtube || {}), channel_id: ytChanId, headless_mode: ytHeadless },
                    tiktok: { ...defaultForm.platform_configs.tiktok, ...(pc.tiktok || {}), headless_mode: ttHeadless },
                    instagram: { ...defaultForm.platform_configs.instagram, ...(pc.instagram || {}), headless_mode: igHeadless },
                };
                const safeData: any = {};
                for (const key of Object.keys(initialData)) {
                    if (initialData[key] != null) safeData[key] = initialData[key];
                }
                const platforms = Array.isArray(safeData.target_platforms) && safeData.target_platforms.length > 0
                    ? safeData.target_platforms
                    : ['youtube'];

                setForm({
                    ...defaultForm,
                    ...safeData,
                    source_external_id: safeData.source_external_id || '',
                    video_file_path: safeData.video_file_path || '',
                    description: safeData.description || '',
                    tags: Array.isArray(safeData.tags) ? safeData.tags.join(', ') : (safeData.tags || ''),
                    hashtags: Array.isArray(safeData.hashtags) ? safeData.hashtags.join(' ') : (safeData.hashtags || ''),
                    platform_configs: mergedConfigs,
                    target_platforms: platforms,
                    approval_required: Boolean(safeData.approval_required),
                    upload_method: safeData.upload_method || 'BROWSER_AUTO',
                    source_type: safeData.source_type || 'MANUAL',
                    enable_shopping_tag: Boolean(safeData.enable_shopping_tag),
                    shopping_tag_keyword: safeData.shopping_tag_keyword || '',
                    scheduleMode: safeData.scheduled_upload_time ? 'scheduled' : 'immediate',
                    scheduledTime: safeData.scheduled_upload_time
                        ? (safeData.scheduled_upload_time.includes('T') ? safeData.scheduled_upload_time : safeData.scheduled_upload_time.replace(' ', 'T')).slice(0, 16)
                        : '',
                });
                loadChannels(ytChanId);
            } else {
                setForm({
                    ...defaultForm,
                    platform_configs: {
                        headless_mode: !showBrowserWindow,
                        youtube: { ...defaultForm.platform_configs.youtube, headless_mode: !showBrowserWindow },
                        tiktok: { ...defaultForm.platform_configs.tiktok, headless_mode: !showBrowserWindow },
                        instagram: { ...defaultForm.platform_configs.instagram, headless_mode: !showBrowserWindow }
                    }
                });
                loadChannels();
            }
        }
    }, [isOpen, initialData, showBrowserWindow]);

    const handleSelectOfficialExport = (filePath: string) => {
        if (!filePath) return;
        setForm(prev => {
            const updated = { ...prev, video_file_path: filePath };
            if (!prev.title.trim()) {
                const fileName = filePath.split(/[/\\]/).pop() || '';
                updated.title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
            }
            return updated;
        });
    };

    const handleBrowseVideo = async () => {
        if ((window as any).electronAPI?.selectVideoFile) {
            const r = await (window as any).electronAPI.selectVideoFile();
            if (r.success && r.path) {
                setForm(prev => {
                    const updated = { ...prev, video_file_path: r.path };
                    if (!prev.title.trim()) {
                        const fileName = r.path.split(/[/\\]/).pop() || '';
                        updated.title = fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                    }
                    return updated;
                });
                return;
            }
        }
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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
                            resolve(JSON.parse(xhr.responseText));
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

            setForm(prev => ({
                ...prev,
                video_file_path: data.server_file_path,
                title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')
            }));
            toast({ title: "영상 업로드 완료", description: `서버에 안전하게 저장되었습니다: ${file.name}` });
        } catch (err: any) {
            toast({ variant: "destructive", title: "업로드 실패", description: err.message || '서버 오류' });
        } finally {
            setIsUploadingVideo(false);
        }
    };

    const handleDraftSave = async () => {
        if (!form.title.trim()) {
            toast({ variant: "destructive", title: "필수", description: "제목을 입력해 주세요" });
            return;
        }

        const isEditing = Boolean(initialData && initialData.id);
        const ytChan = form.platform_configs?.youtube?.channel_id || null;
        const payload: any = {
            title: form.title,
            description: form.description,
            tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            hashtags: form.hashtags.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
            source_external_id: form.source_external_id,
            source_type: form.source_type,
            target_platforms: form.target_platforms?.length ? form.target_platforms : ['youtube'],
            platform_configs: form.platform_configs,
            upload_method: form.upload_method,
            channel_id: ytChan,
            enable_shopping_tag: form.enable_shopping_tag,
            shopping_tag_keyword: form.shopping_tag_keyword,
        };
        if (form.video_file_path) payload.video_file_path = form.video_file_path;

        try {
            const url = isEditing ? `/api/work-queue/items/${initialData.id}` : '/api/work-queue/items/draft';
            const method = isEditing ? 'PATCH' : 'POST';
            const r = await fetchWithRetry(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (r.ok) {
                toast({
                    title: isEditing ? "수정 완료" : "임시 보관됨",
                    description: isEditing ? "작업 대기열 정보가 수정되었습니다." : "기본 정보가 임시 저장되었습니다."
                });
                setIsOpen(false);
                onSuccess();
                setForm(defaultForm);
            } else {
                const e = await r.json();
                toast({ variant: "destructive", title: "오류", description: e.detail || '저장 실패' });
            }
        } catch (_) {
            toast({ variant: "destructive", title: "오류", description: "임시 저장 실패" });
        }
    };

    const handleImmediateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast({ variant: "destructive", title: "필수", description: "제목을 입력해 주세요" });
            return;
        }

        const isEditing = Boolean(initialData && initialData.id);
        const alreadyHasVideo = isEditing && Boolean(initialData?.video_file_path);

        if (!form.video_file_path.trim() && !alreadyHasVideo) {
            toast({ variant: "destructive", title: "영상 파일 필요", description: "공식 저장소에서 영상을 선택하거나 로컬 파일을 첨부해 주세요" });
            return;
        }

        const selectedPlatforms = form.target_platforms?.length ? form.target_platforms : ['youtube'];
        if (selectedPlatforms.includes('youtube') && !form.platform_configs?.youtube?.channel_id) {
            toast({ variant: "destructive", title: "채널 선택 필요", description: "YouTube 업로드 채널을 지정해 주세요" });
            return;
        }

        const ytChan = form.platform_configs?.youtube?.channel_id || null;
        const payload: any = {
            title: form.title,
            description: form.description,
            tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            hashtags: form.hashtags.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
            video_file_path: form.video_file_path || initialData?.video_file_path || '',
            source_external_id: form.source_external_id,
            source_type: form.source_type,
            target_platforms: selectedPlatforms,
            platform_configs: form.platform_configs,
            channel_id: ytChan,
            upload_method: form.upload_method,
            approval_required: form.approval_required,
            scheduled_upload_time: form.scheduleMode === 'scheduled' && form.scheduledTime ? form.scheduledTime : null,
            enable_shopping_tag: form.enable_shopping_tag,
            shopping_tag_keyword: form.shopping_tag_keyword,
        };

        try {
            if (isEditing) {
                // 기존 항목 단순 수정: 상태를 변경하지 않고 메타데이터만 안전하게 업데이트
                const r1 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!r1.ok) {
                    const err = await r1.json();
                    throw new Error(err.detail || '항목 수정 실패');
                }
                toast({
                    title: "변경사항 저장 완료",
                    description: `작업 #${initialData.id}의 정보가 안전하게 업데이트되었습니다.`
                });
            } else {
                // 신규 항목 생성 (POST)
                const r = await fetchWithRetry('/api/work-queue/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (r.ok) {
                    toast({
                        title: "등록 완료",
                        description: form.approval_required ? "승인 대기열(PENDING)에 등록되었습니다." : "작업 대기열에 등록되어 순차 업로드됩니다."
                    });
                } else {
                    const err = await r.json();
                    throw new Error(err.detail || '등록 실패');
                }
            }

            setIsOpen(false);
            onSuccess();
            setForm(defaultForm);
        } catch (err: any) {
            toast({ variant: "destructive", title: "처리 실패", description: err?.message || '서버 오류' });
        }
    };

    const handleSaveAndFinalize = async () => {
        if (!form.title.trim()) {
            toast({ variant: "destructive", title: "필수", description: "제목을 입력해 주세요" });
            return;
        }

        const isEditing = Boolean(initialData && initialData.id);
        const alreadyHasVideo = isEditing && Boolean(initialData?.video_file_path);

        if (!form.video_file_path.trim() && !alreadyHasVideo) {
            toast({ variant: "destructive", title: "영상 파일 필요", description: "공식 저장소에서 영상을 선택하거나 로컬 파일을 첨부해 주세요" });
            return;
        }

        const selectedPlatforms = form.target_platforms?.length ? form.target_platforms : ['youtube'];
        if (selectedPlatforms.includes('youtube') && !form.platform_configs?.youtube?.channel_id) {
            toast({ variant: "destructive", title: "채널 선택 필요", description: "YouTube 업로드 채널을 지정해 주세요" });
            return;
        }

        const ytChan = form.platform_configs?.youtube?.channel_id || null;
        const payload: any = {
            title: form.title,
            description: form.description,
            tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
            hashtags: form.hashtags.split(/[ ,]+/).map((t: string) => t.startsWith('#') ? t : `#${t}`).filter((t: string) => t.length > 1),
            video_file_path: form.video_file_path || initialData?.video_file_path || '',
            source_external_id: form.source_external_id,
            source_type: form.source_type,
            target_platforms: selectedPlatforms,
            platform_configs: form.platform_configs,
            channel_id: ytChan,
            upload_method: form.upload_method,
            approval_required: false,
            scheduled_upload_time: form.scheduleMode === 'scheduled' && form.scheduledTime ? form.scheduledTime : null,
            enable_shopping_tag: form.enable_shopping_tag,
            shopping_tag_keyword: form.shopping_tag_keyword,
        };

        try {
            const r1 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r1.ok) {
                const err = await r1.json();
                throw new Error(err.detail || '항목 수정 실패');
            }

            const r2 = await fetchWithRetry(`/api/work-queue/items/${initialData.id}/finalize`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approval_required: false,
                    upload_method: form.upload_method,
                    target_platforms: selectedPlatforms,
                    scheduled_upload_time: form.scheduleMode === 'scheduled' && form.scheduledTime ? form.scheduledTime : null,
                })
            });
            if (!r2.ok) {
                const err = await r2.json();
                throw new Error(err.detail || '대기열 등록 실패');
            }
            const f2 = await r2.json();
            toast({
                title: "대기열 등록 완료",
                description: f2.upload_queued ? "대기열 등록 및 백그라운드 자동 업로드가 시작되었습니다." : "대기열에 등록되었습니다."
            });

            setIsOpen(false);
            onSuccess();
            setForm(defaultForm);
        } catch (err: any) {
            toast({ variant: "destructive", title: "처리 실패", description: err?.message || '서버 오류' });
        }
    };

    const selectedYtChannel = channels.find((ch: any) => ch.channel_id === (form.platform_configs?.youtube?.channel_id || ''));

    const renderDialogStatusBadge = (status: string) => {
        if (!status) return null;
        const s = status.toUpperCase();
        const colors: Record<string, string> = {
            'DRAFT': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
            'PENDING': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            'QUEUED': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            'UPLOADING': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
            'COMPLETED': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            'FAILED': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            'FAILED_REVIEW': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
        };
        return (
            <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${colors[s] || 'bg-muted text-muted-foreground'}`}>
                {s}
            </Badge>
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card text-foreground border-border">
                {/* 1. 모달 헤더 */}
                <div className="px-6 py-3.5 border-b border-border/80 flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                            <Rocket className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base font-bold text-foreground truncate">
                                {initialData ? `배포 작업 수정 (#${initialData.id})` : '쇼츠 주권 배포 작업 등록'}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground truncate">
                                공식 저장소 렌더링 영상을 선택하고, 전용 LTE 모바일/ISP 회선으로 안전하게 자동 배포합니다
                            </DialogDescription>
                        </div>
                    </div>
                    {initialData && (
                        <div className="shrink-0">
                            {renderDialogStatusBadge(initialData.status)}
                        </div>
                    )}
                </div>

                {/* 2. 2-컬럼 주권 스튜디오 바디 */}
                <form onSubmit={handleImmediateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 dashboard-scroll-area">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        
                        {/* [좌측 컬럼: 7칸 / 58%] 영상 소스 및 콘텐츠 메타데이터 */}
                        <div className="lg:col-span-7 space-y-4 min-w-0">
                            
                            {/* 1) 영상 파일 소스 박스 */}
                            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Film className="w-3.5 h-3.5 text-indigo-500" /> 영상 파일 소스 *
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={loadOfficialExports}
                                        disabled={isLoadingExports}
                                        className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                    >
                                        <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingExports ? 'animate-spin' : ''}`} /> 새로고침
                                    </Button>
                                </div>

                                {/* 공식 저장소 빠른 선택 드롭다운 */}
                                <div>
                                    <Select
                                        value={form.video_file_path || ''}
                                        onValueChange={handleSelectOfficialExport}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-background border-border">
                                            <SelectValue placeholder={isLoadingExports ? "05_Exports 스캔 중..." : (officialExports.length ? `📁 공식 05_Exports 선택 (${officialExports.length}개 영상)` : "05_Exports 폴더에 렌더링 영상 없음")} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {officialExports.map((file: any) => (
                                                <SelectItem key={file.path} value={file.path}>
                                                    <div className="flex items-center justify-between gap-3 text-xs w-full">
                                                        <span className="font-medium truncate max-w-[260px]">{file.filename}</span>
                                                        <span className="text-[10px] text-muted-foreground shrink-0">{file.size_mb} MB · {file.modified_at}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 직접 경로 입력 및 찾아보기 버튼 */}
                                <div className="flex gap-2">
                                    <Input
                                        value={form.video_file_path}
                                        onChange={e => setForm({ ...form, video_file_path: e.target.value })}
                                        placeholder="공식 저장소 영상 또는 로컬 파일 경로..."
                                        className="h-8 text-xs font-mono bg-background border-border flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBrowseVideo}
                                        disabled={isUploadingVideo}
                                        className="h-8 text-xs shrink-0 font-medium border-border"
                                    >
                                        {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-primary" /> : <FolderOpen className="w-3.5 h-3.5 mr-1 text-indigo-500" />}
                                        {isUploadingVideo ? `${uploadPercent}%` : '찾아보기'}
                                    </Button>
                                    <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />
                                </div>

                                {isUploadingVideo && (
                                    <div className="space-y-1">
                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-primary h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-right">서버 전송 중... {uploadPercent}%</p>
                                    </div>
                                )}

                                {/* 인라인 9:16 비디오 프리뷰어 */}
                                {form.video_file_path ? (
                                    <div className="mt-2 pt-2 border-t border-border/60">
                                        <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-[9/16] max-w-[160px] mx-auto shadow-inner group">
                                            <video
                                                key={form.video_file_path}
                                                src={getStreamUrl(form.video_file_path)}
                                                controls
                                                playsInline
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <p className="text-[10px] font-mono text-center text-muted-foreground mt-1.5 truncate">
                                            {form.video_file_path.split(/[/\\]/).pop()}
                                        </p>
                                    </div>
                                ) : (
                                    <div
                                        onClick={handleBrowseVideo}
                                        className="border-2 border-dashed border-border/80 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/30"
                                    >
                                        <FileVideo className="w-7 h-7 mx-auto text-muted-foreground/60 mb-1.5" />
                                        <p className="text-xs font-semibold text-foreground">영상을 선택해 주세요</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            위의 드롭다운에서 선택하거나 [찾아보기]를 클릭하세요
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 2) 콘텐츠 메타데이터 박스 */}
                            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-xs font-semibold text-foreground">제목 *</Label>
                                        <span className="text-[10px] text-muted-foreground">{form.title.length}/100</span>
                                    </div>
                                    <Input
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="쇼츠 영상의 매력적인 제목을 입력하세요"
                                        className="h-8 text-xs bg-background border-border"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold text-foreground">설명</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        rows={3}
                                        placeholder="영상 설명, 요약문, 링크 등을 작성하세요"
                                        className="text-xs bg-background border-border mt-1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold text-foreground">해시태그</Label>
                                        <Input
                                            value={form.hashtags}
                                            onChange={e => setForm({ ...form, hashtags: e.target.value })}
                                            placeholder="#shorts #viral #이슈"
                                            className="h-8 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-background border-border mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold text-foreground">검색 태그 (쉼표 구분)</Label>
                                        <Input
                                            value={form.tags}
                                            onChange={e => setForm({ ...form, tags: e.target.value })}
                                            placeholder="쇼츠, 꿀팁, AI, 추천"
                                            className="h-8 text-xs bg-background border-border mt-1"
                                        />
                                    </div>
                                </div>

                                {/* 쇼핑 태그 설정 */}
                                <div className="pt-2 border-t border-border/60 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-xs font-semibold text-foreground">유튜브 쇼핑 제품 태그</Label>
                                            <p className="text-[10px] text-muted-foreground">업로드 시 제휴 수익 제품 자동 태깅</p>
                                        </div>
                                        <Switch
                                            checked={form.enable_shopping_tag}
                                            onCheckedChange={c => setForm({ ...form, enable_shopping_tag: c })}
                                        />
                                    </div>
                                    {form.enable_shopping_tag && (
                                        <div className="flex gap-2">
                                            <Input
                                                value={form.shopping_tag_keyword}
                                                onChange={e => setForm({ ...form, shopping_tag_keyword: e.target.value })}
                                                placeholder="예: 초경량 무선 청소기, 캠핑 의자"
                                                className="h-8 text-xs bg-background border-border flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        setIsGenerating(true);
                                                        const r = await fetchWithRetry('/api/work-queue/extract-shopping-keyword', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ title: form.title, description: form.description })
                                                        });
                                                        const d = await r.json();
                                                        if (d.keyword) setForm(prev => ({ ...prev, shopping_tag_keyword: d.keyword }));
                                                    } catch (_) {
                                                    } finally {
                                                        setIsGenerating(false);
                                                    }
                                                }}
                                                disabled={isGenerating || !form.title.trim()}
                                                className="h-8 text-xs shrink-0"
                                            >
                                                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                                                AI 추출
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* [우측 컬럼: 5칸 / 42%] 배포 채널 및 스케줄 네트워크 거버넌스 */}
                        <div className="lg:col-span-5 space-y-4 min-w-0">
                            
                            {/* 1) 주권 채널 및 네트워크 회선 박스 */}
                            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3.5">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Rocket className="w-3.5 h-3.5 text-indigo-500" /> 대상 플랫폼 및 주권 채널
                                </Label>

                                {/* 플랫폼 체크박스 */}
                                <div className="flex items-center gap-3">
                                    {['youtube', 'tiktok', 'instagram'].map(p => (
                                        <label key={p} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                            <Checkbox
                                                checked={form.target_platforms.includes(p)}
                                                onCheckedChange={c => {
                                                    const updated = c
                                                        ? [...form.target_platforms, p]
                                                        : form.target_platforms.filter(x => x !== p);
                                                    setForm({ ...form, target_platforms: updated.length ? updated : ['youtube'] });
                                                }}
                                            />
                                            <span className="capitalize">{p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Instagram'}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* YouTube 전용 채널 및 회선 카드 */}
                                {form.target_platforms.includes('youtube') && (
                                    <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                                🎬 YouTube 업로드 채널 *
                                            </span>
                                            {renderChannelNetworkBadge(selectedYtChannel)}
                                        </div>

                                        <Select
                                            value={form.platform_configs?.youtube?.channel_id || ''}
                                            onValueChange={v => {
                                                const ch = channels.find((c: any) => c.channel_id === v);
                                                setForm(prev => ({
                                                    ...prev,
                                                    approval_required: ch?.auto_approve_default ? false : prev.approval_required,
                                                    platform_configs: {
                                                        ...prev.platform_configs,
                                                        youtube: { ...(prev.platform_configs?.youtube || {}), channel_id: v }
                                                    }
                                                }));
                                            }}
                                            disabled={channels.length === 0}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background border-border">
                                                <SelectValue placeholder={channels.length ? "채널 선택" : "등록된 채널 없음"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {channels.map((ch: any) => (
                                                    <SelectItem key={ch.channel_id} value={ch.channel_id}>
                                                        <div className="flex items-center justify-between gap-2 w-full text-xs">
                                                            <span className="truncate max-w-[180px]">{ch.channel_name || ch.title} ({ch.subscriber_count?.toLocaleString()}명)</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {ch.auto_approve_default && (
                                                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">
                                                                        ⭐ 자동승인
                                                                    </span>
                                                                )}
                                                                {renderChannelNetworkBadge(ch)}
                                                            </div>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* 선택된 채널의 네트워크 라인 안내 및 자동 승인 신뢰 배지 */}
                                        {selectedYtChannel && (
                                            <div className="text-[10px] bg-background/80 p-2 rounded-lg border border-border/70 space-y-1">
                                                <div className="flex items-center justify-between text-muted-foreground">
                                                    <span>소유 계정:</span>
                                                    <span className="font-mono text-foreground font-medium truncate max-w-[140px]">
                                                        {selectedYtChannel.profile_email || selectedYtChannel.account_email || '전용 브라우저 세션'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-muted-foreground">
                                                    <span>독립 네트워크 회선:</span>
                                                    <span className="font-semibold text-foreground">
                                                        {selectedYtChannel.bound_device_serial ? `📱 모바일 LTE (${selectedYtChannel.bound_device_serial})` :
                                                         (selectedYtChannel.proxy_port && selectedYtChannel.proxy_port >= 1080 && selectedYtChannel.proxy_port <= 1089) ? `📱 모바일 프록시 (포트 ${selectedYtChannel.proxy_port})` :
                                                         selectedYtChannel.proxy_host ? `🌐 ISP 고정 (${selectedYtChannel.proxy_host})` : `🛡️ 단독 로컬 회선`}
                                                    </span>
                                                </div>
                                                {selectedYtChannel.auto_approve_default && (
                                                    <div className="flex items-center justify-between text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-950/40 p-1.5 rounded border border-blue-200/60 dark:border-blue-800/40 mt-1">
                                                        <span>⭐ 자동 승인 신뢰 채널</span>
                                                        <span className="text-[9px] font-normal text-muted-foreground">등록 시 PENDING 검수 없이 대기열로 직결</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 공개 상태 및 헤드리스 모드 */}
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground">공개 상태</Label>
                                                <Select
                                                    value={form.platform_configs?.youtube?.privacy || 'private'}
                                                    onValueChange={v => setForm(prev => ({
                                                        ...prev,
                                                        platform_configs: {
                                                            ...prev.platform_configs,
                                                            youtube: { ...(prev.platform_configs?.youtube || {}), privacy: v }
                                                        }
                                                    }))}
                                                >
                                                    <SelectTrigger className="h-7 text-xs bg-background border-border mt-0.5">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="private">비공개 (권장)</SelectItem>
                                                        <SelectItem value="unlisted">미등록 (링크)</SelectItem>
                                                        <SelectItem value="public">전체 공개</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex flex-col justify-end pb-1">
                                                <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                                                    <Checkbox
                                                        checked={form.platform_configs?.youtube?.headless_mode ?? true}
                                                        onCheckedChange={c => setForm(prev => ({
                                                            ...prev,
                                                            platform_configs: {
                                                                ...prev.platform_configs,
                                                                youtube: { ...(prev.platform_configs?.youtube || {}), headless_mode: !!c }
                                                            }
                                                        }))}
                                                    />
                                                    <span className="text-[11px] font-medium">스텔스 백그라운드</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TikTok (체크 시 표시) */}
                                {form.target_platforms.includes('tiktok') && (
                                    <div className="p-3 rounded-xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900/40 space-y-2">
                                        <Label className="text-[11px] font-bold text-pink-700 dark:text-pink-300">🎵 TikTok 계정</Label>
                                        <Select
                                            value={form.platform_configs?.tiktok?.account_id || ''}
                                            onValueChange={v => setForm(prev => ({
                                                ...prev,
                                                platform_configs: {
                                                    ...prev.platform_configs,
                                                    tiktok: { ...(prev.platform_configs?.tiktok || {}), account_id: v }
                                                }
                                            }))}
                                        >
                                            <SelectTrigger className="h-7 text-xs bg-background border-border">
                                                <SelectValue placeholder="TikTok 계정 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {tiktokChannels.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Instagram (체크 시 표시) */}
                                {form.target_platforms.includes('instagram') && (
                                    <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                                        <Label className="text-[11px] font-bold text-purple-700 dark:text-purple-300">📸 Instagram 계정</Label>
                                        <Select
                                            value={form.platform_configs?.instagram?.account_id || ''}
                                            onValueChange={v => setForm(prev => ({
                                                ...prev,
                                                platform_configs: {
                                                    ...prev.platform_configs,
                                                    instagram: { ...(prev.platform_configs?.instagram || {}), account_id: v }
                                                }
                                            }))}
                                        >
                                            <SelectTrigger className="h-7 text-xs bg-background border-border">
                                                <SelectValue placeholder="Instagram 계정 선택" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {instagramChannels.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.nickname || c.id}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            {/* 2) 업로드 엔진 및 스케줄 거버넌스 박스 */}
                            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Settings className="w-3.5 h-3.5 text-indigo-500" /> 업로드 엔진 및 발행 스케줄
                                </Label>

                                <div>
                                    <Label className="text-[11px] text-muted-foreground">업로드 실행 엔진</Label>
                                    <Select
                                        value={form.upload_method}
                                        onValueChange={v => setForm({ ...form, upload_method: v })}
                                    >
                                        <SelectTrigger className="h-8 text-xs bg-background border-border mt-0.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BROWSER_AUTO">🤖 스텔스 브라우저 자동화 (회선 격리 보호)</SelectItem>
                                            <SelectItem value="API">⚡ Google Data API (OAuth 직결)</SelectItem>
                                            <SelectItem value="MANUAL">✍️ 수동 (대기열 기록 및 관리용)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 pt-1">
                                    <Label className="text-[11px] text-muted-foreground">발행 타이밍</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                            <input
                                                type="radio"
                                                name="scheduleMode"
                                                checked={form.scheduleMode === 'immediate'}
                                                onChange={() => setForm({ ...form, scheduleMode: 'immediate' })}
                                            />
                                            <span>즉시 대기열 진입</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                                            <input
                                                type="radio"
                                                name="scheduleMode"
                                                checked={form.scheduleMode === 'scheduled'}
                                                onChange={() => setForm({ ...form, scheduleMode: 'scheduled' })}
                                            />
                                            <span>예약 발행</span>
                                        </label>
                                    </div>
                                    {form.scheduleMode === 'scheduled' && (
                                        <div className="mt-1.5">
                                            <Input
                                                type="datetime-local"
                                                value={form.scheduledTime}
                                                onChange={e => setForm({ ...form, scheduledTime: e.target.value })}
                                                className="h-8 text-xs bg-background border-border"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-2 border-t border-border/60">
                                    <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                        <Checkbox
                                            checked={form.approval_required}
                                            onCheckedChange={c => setForm({ ...form, approval_required: Boolean(c) })}
                                        />
                                        <span>관리자 승인 필요 (체크 시 승인 대기 PENDING 상태로 보관)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. 모달 하단 푸터 액션 버튼 */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/80">
                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDraftSave}
                                className="h-8 text-xs border-border bg-background hover:bg-muted text-foreground"
                            >
                                <Save className="w-3.5 h-3.5 mr-1.5" /> 임시 보관
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                                취소
                            </Button>
                            {initialData ? (
                                <>
                                    <Button
                                        type="submit"
                                        variant="secondary"
                                        className="h-8 text-xs font-semibold gap-1.5 border border-border"
                                    >
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        변경사항 저장
                                    </Button>
                                    {(initialData.status === 'DRAFT' || initialData.status === 'PENDING') && (
                                        <Button
                                            type="button"
                                            onClick={handleSaveAndFinalize}
                                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                                        >
                                            <Rocket className="w-3.5 h-3.5" />
                                            수정 후 대기열 즉시 등록
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button
                                    type="submit"
                                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-xs"
                                >
                                    <Rocket className="w-3.5 h-3.5" />
                                    대기열 즉시 등록
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const BulkImportDialog = ({ 
    isOpen, 
    setIsOpen, 
    onSuccess, 
    channels = [], 
    showBrowserWindow = false 
}: { 
    isOpen: boolean; 
    setIsOpen: (v: boolean) => void; 
    onSuccess: () => void;
    channels?: any[];
    showBrowserWindow?: boolean;
}) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [batchId, setBatchId] = useState('');
    const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'done'>('idle');
    const [defaultChannelId, setDefaultChannelId] = useState<string>('');
    const [approvalPolicy, setApprovalPolicy] = useState<'GOVERNANCE' | 'MANUAL' | 'IMMEDIATE'>('GOVERNANCE');
    const cachedFileBytes = useRef<Uint8Array | null>(null);
    const cachedFileName = useRef<string>('');

    useEffect(() => {
        if (channels && channels.length > 0 && !defaultChannelId) {
            setDefaultChannelId(channels[0].channel_id || channels[0].id || '');
        }
    }, [channels]);

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

            mapped.push(item);
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

            const selectedChannel = channels.find((c: any) => String(c.channel_id) === String(defaultChannelId) || String(c.id) === String(defaultChannelId));
            const isTrustedChannel = Boolean(selectedChannel?.auto_approve_default);
            const approvalReq = approvalPolicy === 'MANUAL' ? true : (approvalPolicy === 'IMMEDIATE' || isTrustedChannel ? false : false);

            const items = parsedRows.map(r => {
                const platformConfigs: any = {
                    headless_mode: !showBrowserWindow,
                    youtube: {
                        channel_id: defaultChannelId,
                        privacy: r.platform_privacy || 'private',
                        headless_mode: !showBrowserWindow,
                    },
                    tiktok: {
                        headless_mode: !showBrowserWindow,
                    },
                    instagram: {
                        headless_mode: !showBrowserWindow,
                    }
                };
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
                    platform_configs: platformConfigs,
                    scheduled_upload_time: r.scheduled_time || null,
                    channel_id: defaultChannelId || null,
                    approval_required: approvalReq,
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

    const selectedChannel = channels.find((c: any) => String(c.channel_id) === String(defaultChannelId) || String(c.id) === String(defaultChannelId));

    return (
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) reset(); }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        쇼츠 일괄 등록 (CSV / Excel)
                    </DialogTitle>
                    <DialogDescription>
                        CSV 또는 Excel 파일로 다수의 영상을 한번에 대기열에 등록하고 일괄 자동 배포합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* 일괄 적용 채널 및 승인 정책 거버넌스 설정 바 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                        <div>
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1.5">
                                🎬 기본 적용 YouTube 채널
                            </Label>
                            <Select value={defaultChannelId} onValueChange={setDefaultChannelId}>
                                <SelectTrigger className="h-8 text-xs bg-background border-border">
                                    <SelectValue placeholder={channels.length ? "채널 선택" : "등록된 채널 없음"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {channels.map((ch: any) => (
                                        <SelectItem key={ch.channel_id || ch.id} value={ch.channel_id || ch.id}>
                                            <div className="flex items-center justify-between gap-2 w-full text-xs">
                                                <span className="truncate">{ch.channel_name || ch.title || ch.name}</span>
                                                {ch.auto_approve_default && (
                                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">
                                                        ⭐ 자동승인
                                                    </span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedChannel?.auto_approve_default && (
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                                    ⭐ 자동 승인 신뢰 채널: 등록 즉시 승인 대기 없이 대기열로 직결됩니다.
                                </p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1.5">
                                🛡️ 일괄 승인 거버넌스 정책
                            </Label>
                            <Select value={approvalPolicy} onValueChange={(v: any) => setApprovalPolicy(v)}>
                                <SelectTrigger className="h-8 text-xs bg-background border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GOVERNANCE">⭐ 스마트 자동 승인 (신뢰 채널 / 85점 기준)</SelectItem>
                                    <SelectItem value="MANUAL">🛡️ 전수 수동 확인 (PENDING 대기)</SelectItem>
                                    <SelectItem value="IMMEDIATE">⚡ 즉시 대기열 등록 (100% 자동 직결)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                * 창 표시: <strong className="text-foreground">{showBrowserWindow ? "화면 표시(켜짐)" : "백그라운드 스텔스"}</strong> 설정이 적용됩니다.
                            </p>
                        </div>
                    </div>

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