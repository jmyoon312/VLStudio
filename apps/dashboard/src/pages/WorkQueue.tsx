import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
    Upload, FileVideo, Workflow, Image, CheckCircle, XCircle, Clock,
    Play, Pause, Trash2, Edit, Eye, Youtube, Send, Settings, RotateCcw, AlertTriangle
} from 'lucide-react';

const WorkQueue = () => {
    const { toast } = useToast();
    const [queueItems, setQueueItems] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [activeTab, setActiveTab] = useState('queued');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [wsConnections, setWsConnections] = useState<Map<number, WebSocket>>(new Map());

    // === 데이터 로딩 ===
    useEffect(() => {
        loadQueueItems();
        loadStats();
        const interval = setInterval(() => {
            loadQueueItems();
            loadStats();
        }, 5000); // 5초마다 새로고침
        return () => clearInterval(interval);
    }, [activeTab]);

    // === WebSocket 연결 관리 ===
    useEffect(() => {
        // 업로드 중인 항목에 대해 WebSocket 연결
        const uploadingItems = queueItems.filter(item => item.status === 'UPLOADING');

        uploadingItems.forEach(item => {
            if (!wsConnections.has(item.id)) {
                connectWebSocket(item.id);
            }
        });

        // 더 이상 업로드 중이 아닌 항목의 연결 종료
        wsConnections.forEach((ws, itemId) => {
            const item = queueItems.find(i => i.id === itemId);
            if (!item || item.status !== 'UPLOADING') {
                ws.close();
                wsConnections.delete(itemId);
            }
        });

        return () => {
            // 컴포넌트 언마운트 시 모든 연결 종료
            wsConnections.forEach(ws => ws.close());
        };
    }, [queueItems]);

    const connectWebSocket = (itemId: number) => {
        const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/work-queue/ws/progress/${itemId}`);

        ws.onopen = () => {
            console.log(`WebSocket connected for item ${itemId}`);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Progress update:', data);

                // 진행률 업데이트
                setQueueItems(prevItems =>
                    prevItems.map(item =>
                        item.id === data.queue_item_id
                            ? { ...item, upload_progress: data.progress }
                            : item
                    )
                );

                // 토스트 알림
                if (data.progress === 100) {
                    toast({ title: "업로드 완료", description: data.message });
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for item ${itemId}:`, error);
        };

        ws.onclose = () => {
            console.log(`WebSocket closed for item ${itemId}`);
        };

        setWsConnections(prev => new Map(prev).set(itemId, ws));
    };

    const loadQueueItems = async () => {
        try {
            const statusFilter = activeTab === 'queued' ? 'QUEUED' :
                activeTab === 'uploading' ? 'UPLOADING' :
                    activeTab === 'completed' ? 'COMPLETED' : null;

            const url = statusFilter
                ? `/api/work-queue/items?status=${statusFilter}`
                : '/api/work-queue/items';

            const response = await fetchWithRetry(url);
            const data = await response.json();
            setQueueItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load queue items:', error);
            setQueueItems([]);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetchWithRetry('/api/work-queue/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    // === 상태별 배지 ===
    const getStatusBadge = (status) => {
        const variants = {
            'QUEUED': { variant: 'secondary', icon: Clock, text: '대기 중' },
            'UPLOADING': { variant: 'default', icon: Upload, text: '업로드 중' },
            'COMPLETED': { variant: 'success', icon: CheckCircle, text: '완료' },
            'FAILED': { variant: 'destructive', icon: XCircle, text: '실패' }
        };
        const config = variants[status] || variants['QUEUED'];
        const Icon = config.icon;
        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {config.text}
            </Badge>
        );
    };

    const getApprovalBadge = (approvalStatus) => {
        const variants = {
            'PENDING': { variant: 'outline', text: '승인 대기' },
            'APPROVED': { variant: 'success', text: '승인됨' },
            'REJECTED': { variant: 'destructive', text: '반려됨' },
            'AUTO_APPROVED': { variant: 'secondary', text: '자동 승인' }
        };
        const config = variants[approvalStatus] || variants['PENDING'];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // === 승인/반려 (HITL Gateway) ===
    const handleApprove = async (itemId) => {
        try {
            // [NEW] Call the LangGraph Resume API
            await fetchWithRetry(`/api/swarm/missions/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: String(itemId), action: 'APPROVE' })
            });
            toast({ title: "승인 완료", description: "영상이 렌더링 노드로 진입했습니다." });
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "승인 처리 실패" });
        }
    };

    const handleReject = async (itemId, reason) => {
        try {
            // [NEW] Call the LangGraph Resume API with REJECT action
            await fetchWithRetry(`/api/swarm/missions/resume`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: String(itemId), action: 'REJECT', modified_script: reason })
            });
            toast({ title: "반려 완료", description: "작업이 반려되었습니다." });
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "반려 처리 실패" });
        }
    };

    // === 삭제 ===
    const handleDelete = async (itemId: number) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await fetchWithRetry(`/api/work-queue/items/${itemId}`, { method: 'DELETE' });
            toast({ title: "삭제 완료" });
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "삭제 실패" });
        }
    };

    // === 일괄 작업 ===
    const handleBatchApprove = async () => {
        if (selectedItems.length === 0) {
            toast({ variant: "destructive", title: "오류", description: "선택된 항목이 없습니다." });
            return;
        }

        try {
            const response = await fetchWithRetry('/api/work-queue/batch/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: selectedItems,
                    approved_by: 'user'
                })
            });

            const result = await response.json();
            toast({
                title: "일괄 승인 완료",
                description: `${result.approved}개 승인, ${result.failed}개 실패`
            });

            setSelectedItems([]);
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "일괄 승인 실패" });
        }
    };

    const handleBatchReject = async () => {
        if (selectedItems.length === 0) {
            toast({ variant: "destructive", title: "오류", description: "선택된 항목이 없습니다." });
            return;
        }

        const reason = prompt('반려 사유를 입력하세요:');
        if (!reason) return;

        try {
            const response = await fetchWithRetry('/api/work-queue/batch/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: selectedItems,
                    reason
                })
            });

            const result = await response.json();
            toast({
                title: "일괄 반려 완료",
                description: `${result.rejected}개 반려, ${result.failed}개 실패`
            });

            setSelectedItems([]);
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "일괄 반려 실패" });
        }
    };

    const handleBatchDelete = async () => {
        if (selectedItems.length === 0) {
            toast({ variant: "destructive", title: "오류", description: "선택된 항목이 없습니다." });
            return;
        }

        if (!confirm(`선택한 ${selectedItems.length}개 항목을 삭제하시겠습니까?`)) return;

        try {
            const response = await fetchWithRetry('/api/work-queue/batch/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: selectedItems
                })
            });

            const result = await response.json();
            toast({
                title: "일괄 삭제 완료",
                description: `${result.deleted}개 삭제, ${result.failed}개 실패`
            });

            setSelectedItems([]);
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "일괄 삭제 실패" });
        }
    };

    const handleBatchReset = async () => {
        if (selectedItems.length === 0) {
            toast({ variant: "destructive", title: "오류", description: "선택된 항목이 없습니다." });
            return;
        }

        try {
            const response = await fetchWithRetry('/api/work-queue/batch/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: selectedItems
                })
            });

            const result = await response.json();
            toast({
                title: "상태 초기화 완료",
                description: `${result.reset}개 항목이 대기 상태로 변경되었습니다.`
            });

            setSelectedItems([]);
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "초기화 실패" });
        }
    };

    const toggleItemSelection = (itemId: number) => {
        setSelectedItems(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    const toggleAllSelection = () => {
        if (selectedItems.length === queueItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(queueItems.map(item => item.id));
        }
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">자동화 작업 대기열</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">인간 개입(HITL) 및 팩토리 승인 대기열 관리</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                    onClick={() => {
                        setEditingItem(null);
                        setIsAddDialogOpen(true);
                    }}
                >
                    <Upload className="w-4 h-4 mr-2" />
                    신규 작업 수동 추가
                </Button>
            </div>

            {/* [NEW] HITL Emergency Orange Pulse Banner */}
            {queueItems.some(item => item.approval_status === 'PENDING') && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-full relative">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-900">긴급 검수 대기 중 (HITL)</h3>
                            <p className="text-sm text-orange-700">에이전트가 렌더링 직전 인간 디렉터의 승인을 기다리며 프로세스를 일시 정지(Suspend)했습니다.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => setActiveTab('queued')}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-md"
                    >
                        대기열 확인하기
                    </Button>
                </div>
            )}

            <VideoPlayerDialog
                isOpen={isPlayerOpen}
                setIsOpen={setIsPlayerOpen}
                item={playingItem}
            />

            <AddVideoDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                onSuccess={() => {
                    loadQueueItems();
                    setEditingItem(null);
                }}
                initialData={editingItem}
            />

            {/* 통계 카드 */}
            <div className="grid grid-cols-5 gap-4">
                <StatCard title="전체" value={stats.total || 0} icon={FileVideo} />
                <StatCard title="대기 중" value={stats.queued || 0} icon={Clock} color="blue" />
                <StatCard title="업로드 중" value={stats.uploading || 0} icon={Upload} color="yellow" />
                <StatCard title="완료" value={stats.completed || 0} icon={CheckCircle} color="green" />
                <StatCard title="실패" value={stats.failed || 0} icon={XCircle} color="red" />
            </div>

            {/* 일괄 작업 툴바 */}
            {selectedItems.length > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedItems.length === queueItems.length}
                                    onCheckedChange={toggleAllSelection}
                                />
                                <span className="font-medium text-blue-900">
                                    {selectedItems.length}개 선택됨
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleBatchApprove}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    일괄 승인
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={handleBatchReject}
                                >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    일괄 반려
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBatchDelete}
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    일괄 삭제
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleBatchReset}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700"
                                >
                                    <RotateCcw className="w-4 h-4 mr-1" />
                                    재설정 (Retry)
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedItems([])}
                                >
                                    선택 해제
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 탭 */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="queued">대기열 ({stats.queued || 0})</TabsTrigger>
                    <TabsTrigger value="uploading">진행 중 ({stats.uploading || 0})</TabsTrigger>
                    <TabsTrigger value="completed">완료됨 ({stats.completed || 0})</TabsTrigger>
                    <TabsTrigger value="all">전체</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {queueItems.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="grid gap-4">
                            {queueItems.map(item => (
                                <QueueItemCard
                                    key={item.id}
                                    item={item}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onDelete={handleDelete}
                                    onEdit={(item) => {
                                        setEditingItem(item);
                                        setIsAddDialogOpen(true);
                                    }}
                                    onPlay={(item) => {
                                        setPlayingItem(item);
                                        setIsPlayerOpen(true);
                                    }}
                                    getStatusBadge={getStatusBadge}
                                    getApprovalBadge={getApprovalBadge}
                                    selectedItems={selectedItems}
                                    toggleItemSelection={toggleItemSelection}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

// === 통계 카드 ===
const StatCard = ({ title, value, icon: Icon, color = 'slate' }) => {
    const colors = {
        slate: 'bg-slate-100 text-slate-600',
        blue: 'bg-blue-100 text-blue-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600'
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-slate-500">{title}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${colors[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// === 대기열 항목 카드 ===
const QueueItemCard = ({ item, onApprove, onReject, onDelete, onEdit, onPlay, getStatusBadge, getApprovalBadge, selectedItems, toggleItemSelection }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold">{item.title}</h3>
                                {getStatusBadge(item.status)}
                                {getApprovalBadge(item.approval_status)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <FileVideo className="w-4 h-4" />
                                    {item.source_type || 'MANUAL'}
                                </span>
                                <span className="flex items-center gap-1 cursor-pointer hover:text-blue-600" onClick={() => onPlay(item)}>
                                    <Play className="w-3 h-3" />
                                    미리보기
                                </span>
                                <span>생성: {new Date(item.created_at).toLocaleString('ko-KR')}</span>
                                {item.target_platforms && (
                                    <span className="flex items-center gap-1">
                                        {item.target_platforms.map(platform => (
                                            <Badge key={platform} variant="outline" className="text-xs">
                                                {platform}
                                            </Badge>
                                        ))}
                                    </span>
                                )}
                            </div>

                            {item.status === 'UPLOADING' && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span>업로드 진행률</span>
                                        <span className="font-medium">{item.upload_progress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${item.upload_progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {isExpanded && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                                    <p><strong>설명:</strong> {item.description || '없음'}</p>
                                    <p><strong>파일 경로:</strong> {item.video_file_path}</p>
                                    <p><strong>업로드 방식:</strong> {item.upload_method || 'API'}</p>
                                    {item.failure_reason && (
                                        <p className="text-red-600"><strong>실패 사유:</strong> {item.failure_reason}</p>
                                    )}
                                    <div className="pt-2 border-t border-slate-200 mt-2">
                                        <p className="text-xs text-slate-400">전체 데이터 확인</p>
                                        <div className="grid grid-cols-2 gap-4 mt-1">
                                            <div>
                                                <span className="text-xs font-semibold block text-slate-500">업로드 방식</span>
                                                <Badge variant={item.upload_method === 'BROWSER_AUTO' ? 'default' : 'secondary'} className="mt-0.5">
                                                    {item.upload_method === 'BROWSER_AUTO' ? '브라우저 자동화 (Anti-Detect)' : '공식 API'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold block text-slate-500">공개 설정</span>
                                                {/* Platform Configs Check */}
                                                <span className="text-sm">
                                                    {item.platform_configs?.youtube?.privacy || '기본값'}
                                                    {item.platform_configs?.youtube?.privacy === 'private' && ' (검토 후 공개)'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                            {item.approval_status === 'PENDING' && (
                                <>
                                    <Button size="sm" onClick={() => onApprove(item.id)} className="bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        승인
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => onReject(item.id, '품질 미달')}>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        반려
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// === 빈 상태 ===
const EmptyState = () => (
    <Card>
        <CardContent className="p-12 text-center">
            <FileVideo className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">대기열이 비어있습니다</h3>
            <p className="text-slate-500">영상을 추가하여 업로드를 시작하세요</p>
        </CardContent>
    </Card>
);

// === 비디오 플레이어 다이얼로그 ===
const VideoPlayerDialog = ({ isOpen, setIsOpen, item }: any) => {
    if (!item) return null;

    // Use /api/work-queue/stream endpoint
    const videoUrl = `/api/work-queue/stream?path=${encodeURIComponent(item.video_file_path)}`;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl bg-black p-1 border-slate-800">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full"
                        onError={(e) => console.error("Video load error", e)}
                    />
                </div>
                <div className="p-4 bg-slate-900 text-white rounded-b-lg">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-slate-400 text-sm mt-1">{item.video_file_path}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// === 영상 추가/수정 다이얼로그 ===
const AddVideoDialog = ({ isOpen, setIsOpen, onSuccess, initialData }: any) => {
    const { toast } = useToast();
    const [channels, setChannels] = useState<any[]>([]);
    const [tiktokChannels, setTiktokChannels] = useState<any[]>([]);
    const [instagramChannels, setInstagramChannels] = useState<any[]>([]);

    // Default State
    const defaultState = {
        title: '',
        description: '',
        hashtags: '', // [NEW] Separate Hashtags
        tags: '',     // Hidden Tags
        video_file_path: '',
        source_type: 'MANUAL',
        approval_required: false,
        upload_method: 'BROWSER_AUTO',
        target_platforms: ['youtube'],
        platform_configs: {
            youtube: {
                channel_id: '',
                privacy: 'private',
                category: '22',
                made_for_kids: false
            },
            tiktok: {
                account_id: '',
                privacy: 'private',
                allow_comments: true,
                allow_duet: true
            },
            instagram: {
                account_id: '',
                caption: '',
                share_to_feed: false
            }
        },
        // [NEW] Schedule State
        uploadScheduleMode: 'immediate', // immediate, scheduled
        scheduledTime: '' // datetime string
    };

    const [formData, setFormData] = useState(defaultState);

    // Initialize with data if editing
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Formatting for Edit Mode
                setFormData({
                    ...defaultState,
                    ...initialData,
                    tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
                    hashtags: Array.isArray(initialData.hashtags) ? initialData.hashtags.join(' ') : (initialData.hashtags || ''),
                    platform_configs: initialData.platform_configs || defaultState.platform_configs,
                    // [NEW] Schedule Restore
                    uploadScheduleMode: initialData.scheduled_upload_time ? 'scheduled' : 'immediate',
                    scheduledTime: initialData.scheduled_upload_time ? new Date(initialData.scheduled_upload_time).toISOString().slice(0, 16) : ''
                });
            } else {
                setFormData(defaultState);
            }
        } else {
            setFormData(defaultState);
        }
        loadChannels();
        loadSocialChannels();
    }, [isOpen, initialData]);

    const loadSocialChannels = async () => {
        try {
            const [resTk, resIg] = await Promise.all([
                fetchWithRetry('/api/tiktok-channels/'),
                fetchWithRetry('/api/instagram-channels/')
            ]);

            if (resTk.ok) setTiktokChannels(await resTk.json());
            if (resIg.ok) setInstagramChannels(await resIg.json());

        } catch (e) {
            console.error("Failed to load social channels", e);
        }
    };

    const loadChannels = async () => {
        try {
            // Fetch profiles first to get valid IDs dynamically instead of hardcoding
            const tinCanRes = await fetchWithRetry('/api/resources/profiles?type=TIN_CAN');
            const captainRes = await fetchWithRetry('/api/resources/profiles?type=CAPTAIN');
            if (!tinCanRes.ok || !captainRes.ok) throw new Error('Failed to fetch profiles');
            const tinCanProfiles = await tinCanRes.json();
            const captainProfiles = await captainRes.json();
            
            const tinCanProfile = tinCanProfiles.find((p: any) => p.status === 'ACTIVE' || p.status === 'DRAFT');
            const captainProfile = captainProfiles.find((p: any) => p.status === 'ACTIVE');

            // API 자동화: TinCan 계정의 OWNER 채널 사용 (전체 API 접근 가능)
            // 브라우저 자동화: Captain 계정의 MANAGER 채널 사용 (Analytics 제한)
            let profileId = '';
            if (formData.upload_method === 'API') {
                profileId = tinCanProfile?.id || '';
            } else {
                profileId = captainProfile?.id || '';
            }

            if (!profileId) {
                console.warn('No active profile found for role. Using empty channels list.');
                setChannels([]);
                return;
            }

            const role = formData.upload_method === 'API' ? 'OWNER' : 'MANAGER';
            const endpoint = `/api/youtube/captain/${profileId}/channels?role=${role}`;

            const response = await fetchWithRetry(endpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            setChannels(Array.isArray(data) ? data : []);

            // 첫 번째 채널을 기본값으로 설정
            if (Array.isArray(data) && data.length > 0 && !formData.platform_configs.youtube.channel_id) {
                setFormData(prev => ({
                    ...prev,
                    platform_configs: {
                        ...prev.platform_configs,
                        youtube: {
                            ...prev.platform_configs.youtube,
                            channel_id: data[0].channel_id
                        }
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to load channels:', error);
            setChannels([]);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                hashtags: formData.hashtags.split(/[ ,]+/).map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 1),
                scheduled_upload_time: formData.uploadScheduleMode === 'scheduled' ? formData.scheduledTime : null
            };

            const url = initialData ? `/api/work-queue/items/${initialData.id}/` : '/api/work-queue/items/';
            const method = initialData ? 'PATCH' : 'POST';

            const response = await fetchWithRetry(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                toast({ title: "성공", description: "영상이 대기열에 추가되었습니다." });
                setIsOpen(false);
                onSuccess();
                // 폼 초기화
                setFormData({
                    title: '',
                    description: '',
                    tags: '',
                    hashtags: '',
                    video_file_path: '',
                    source_type: 'MANUAL',
                    approval_required: false,
                    upload_method: 'BROWSER_AUTO',
                    target_platforms: ['youtube'],
                    platform_configs: {
                        youtube: {
                            channel_id: '',
                            privacy: 'private',
                            category: '22',
                            made_for_kids: false
                        },
                        tiktok: {
                            account_id: '',
                            privacy: 'public',
                            allow_comments: true,
                            allow_duet: true
                        },
                        instagram: {
                            account_id: '',
                            caption: '',
                            share_to_feed: false
                        }
                    },
                    uploadScheduleMode: 'immediate',
                    scheduledTime: ''
                });
            } else {
                const error = await response.json();
                toast({ variant: "destructive", title: "오류", description: error.detail });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "영상 추가 실패" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? '작업 대기열 수정' : '작업 대기열에 영상 추가'}</DialogTitle>
                    <DialogDescription>
                        업로드할 영상의 정보를 입력하고 대상 플랫폼을 선택하세요.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 기본 정보 */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-semibold text-sm text-slate-700">기본 정보</h3>

                        <div>
                            <Label>제목 *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label>설명</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={8}
                                placeholder="영상 설명을 입력하세요."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>해시태그 (설명에 포함)</Label>
                                <Input
                                    value={formData.hashtags}
                                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                                    placeholder="#Shorts #Viral #Tending"
                                />
                                <p className="text-xs text-slate-500 mt-1">공백으로 구분, 자동으로 # 붙음</p>
                            </div>
                            <div>
                                <Label>태그 (메타데이터, 쉼표 구분)</Label>
                                <Input
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="shorts, viral, 추천"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>영상 파일 경로 *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.video_file_path}
                                    onChange={(e) => setFormData({ ...formData, video_file_path: e.target.value })}
                                    placeholder="F:\download\video.mp4"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                        // Simple file picker simulation or logic
                                        const path = prompt('Enter full file path:', 'F:\\download\\video.mp4');
                                        if (path) setFormData({ ...formData, video_file_path: path });
                                    }}
                                >
                                    탐색기 열기
                                </Button>
                            </div>
                        </div>

                        {/* AI button simplified */}
                        {formData.video_file_path && (
                            <div className="flex justify-end">
                                <Button type="button" variant="outline" onClick={() => toast({ title: "AI Analysis", description: "Analyzing..." })}>
                                    AI 자동 채우기
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* 유입 경로 및 업로드 설정 */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-semibold text-sm text-slate-700">업로드 설정</h3>

                        <div>
                            <Label>유입 경로</Label>
                            <Select value={formData.source_type} onValueChange={(value) => setFormData({ ...formData, source_type: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MANUAL">수동 업로드</SelectItem>
                                    <SelectItem value="WORKFLOW">워크플로우</SelectItem>
                                    <SelectItem value="SCRIPT_REMIX">스크립트 리믹스</SelectItem>
                                    <SelectItem value="GALLERY_EXPORT">갤러리 내보내기</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>업로드 방식</Label>
                            <Select value={formData.upload_method} onValueChange={(value) => setFormData({ ...formData, upload_method: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="API">Google API 자동화</SelectItem>
                                    <SelectItem value="BROWSER_AUTO">브라우저 자동화</SelectItem>
                                    <SelectItem value="MANUAL">수동 업로드</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="approval_required"
                                checked={formData.approval_required}
                                onCheckedChange={(checked) => setFormData({ ...formData, approval_required: !!checked })}
                            />
                            <Label htmlFor="approval_required" className="cursor-pointer">검토 필요 (체크 해제 시 자동 순차 업로드)</Label>
                        </div>
                    </div >

                    {/* [NEW] 업로드 일정 (Schedule) */}
                    < div className="space-y-4 pt-4 border-t border-slate-100" >
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> 업로드 일정 설정
                        </h3>
                        <div className="space-y-3 pl-1">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="schedule-immediate"
                                        name="schedule"
                                        value="immediate"
                                        checked={formData.uploadScheduleMode === 'immediate'}
                                        onChange={() => setFormData({ ...formData, uploadScheduleMode: 'immediate' })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="schedule-immediate" className="font-normal cursor-pointer">⚡ 즉시 업로드</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="schedule-later"
                                        name="schedule"
                                        value="scheduled"
                                        checked={formData.uploadScheduleMode === 'scheduled'}
                                        onChange={() => setFormData({ ...formData, uploadScheduleMode: 'scheduled' })}
                                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="schedule-later" className="font-normal cursor-pointer">📅 예약 업로드 (날짜 지정)</Label>
                                </div>
                            </div>

                            {formData.uploadScheduleMode === 'scheduled' && (
                                <div className="flex flex-col gap-2 p-3 bg-blue-50 rounded-md animate-in fade-in slide-in-from-top-1">
                                    <Label className="text-xs text-blue-700 font-semibold">업로드 예정 일시</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.scheduledTime}
                                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                                        className="bg-white"
                                        min={new Date().toISOString().slice(0, 16)}
                                    />
                                    <p className="text-xs text-blue-500">
                                        * 지정된 시간에 자동으로 업로드가 시작됩니다. (PC가 켜져 있어야 합니다)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div >

                    {/* 플랫폼 선택 */}
                    < div className="space-y-4 p-4 bg-slate-50 rounded-lg" >
                        <h3 className="font-semibold text-sm text-slate-700">대상 플랫폼</h3>
                        <div className="flex gap-4">
                            {['youtube', 'tiktok', 'instagram'].map(platform => (
                                <label key={platform} className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.target_platforms.includes(platform)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFormData({ ...formData, target_platforms: [...formData.target_platforms, platform] });
                                            } else {
                                                setFormData({ ...formData, target_platforms: formData.target_platforms.filter(p => p !== platform) });
                                            }
                                        }}
                                    />
                                    <span className="capitalize">{platform}</span>
                                </label>
                            ))}
                        </div>
                    </div >

                    {/* YouTube 설정 */}
                    {
                        formData.target_platforms.includes('youtube') && (
                            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h3 className="font-semibold text-sm text-blue-900 flex items-center gap-2">
                                    <Youtube className="w-4 h-4" />
                                    YouTube 설정
                                </h3>

                                <div>
                                    <Label>채널 선택 *</Label>
                                    <Select
                                        value={formData.platform_configs.youtube.channel_id}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                youtube: { ...formData.platform_configs.youtube, channel_id: value }
                                            }
                                        })}
                                        disabled={channels.length === 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                channels.length === 0
                                                    ? (formData.upload_method === 'API'
                                                        ? "소유한 채널이 없습니다"
                                                        : "위임받은 채널이 없습니다")
                                                    : "채널을 선택하세요"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels.length === 0 ? (
                                                <div className="p-4 text-sm text-slate-500 text-center">
                                                    {formData.upload_method === 'API'
                                                        ? "일반 계정에 소유한 브랜드 채널이 없습니다."
                                                        : "관리자 계정에 위임받은 브랜드 채널이 없습니다."}
                                                </div>
                                            ) : (
                                                channels.map(channel => (
                                                    <SelectItem key={channel.channel_id} value={channel.channel_id}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">
                                                                {channel.channel_name || channel.title} ({channel.subscriber_count?.toLocaleString()} 구독자)
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {formData.upload_method === 'API' ? 'OWNER' : 'MANAGER'}
                                                            </Badge>
                                                            <span className="text-xs text-slate-500">
                                                                {formData.upload_method === 'API' ? '일반계정' : '관리자계정'}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {channels.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            {formData.upload_method === 'API'
                                                ? "💡 Google Accounts에서 브랜드 채널을 생성하거나 연결하세요."
                                                : "💡 Captain 계정에서 브랜드 채널 위임을 받으세요."}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label>공개 범위</Label>
                                    <Select
                                        value={formData.platform_configs.youtube.privacy}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                youtube: { ...formData.platform_configs.youtube, privacy: value }
                                            }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">공개</SelectItem>
                                            <SelectItem value="unlisted">일부 공개</SelectItem>
                                            <SelectItem value="private">비공개</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>


                            </div>
                        )
                    }

                    {/* TikTok 설정 */}
                    {
                        formData.target_platforms.includes('tiktok') && (
                            <div className="space-y-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                                <h3 className="font-semibold text-sm text-pink-900">TikTok 설정</h3>

                                <div>
                                    <Label>계정 선택 *</Label>
                                    <Select
                                        value={formData.platform_configs.tiktok.account_id}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                tiktok: { ...formData.platform_configs.tiktok, account_id: value }
                                            }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={tiktokChannels.length === 0 ? "연결된 계정이 없습니다" : "TikTok 계정 선택"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiktokChannels.map(ch => (
                                                <SelectItem key={ch.id} value={ch.id}>
                                                    {ch.nickname || ch.id} ({ch.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>공개 범위</Label>
                                    <Select
                                        value={formData.platform_configs.tiktok.privacy}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                tiktok: { ...formData.platform_configs.tiktok, privacy: value }
                                            }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">공개</SelectItem>
                                            <SelectItem value="friends">친구만</SelectItem>
                                            <SelectItem value="private">나만 보기</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.platform_configs.tiktok.allow_comments}
                                        onCheckedChange={(checked) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                tiktok: { ...formData.platform_configs.tiktok, allow_comments: !!checked }
                                            }
                                        })}
                                    />
                                    <Label>댓글 허용</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.platform_configs.tiktok.allow_duet}
                                        onCheckedChange={(checked) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                tiktok: { ...formData.platform_configs.tiktok, allow_duet: !!checked }
                                            }
                                        })}
                                    />
                                    <Label>듀엣 허용</Label>
                                </div>

                            </div>
                        )
                    }

                    {/* Instagram 설정 */}
                    {
                        formData.target_platforms.includes('instagram') && (
                            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <h3 className="font-semibold text-sm text-purple-900">Instagram 설정</h3>

                                <div>
                                    <Label>계정 선택 *</Label>
                                    <Select
                                        value={formData.platform_configs.instagram.account_id}
                                        onValueChange={(value) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                instagram: { ...formData.platform_configs.instagram, account_id: value }
                                            }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={instagramChannels.length === 0 ? "연결된 계정이 없습니다" : "Instagram 계정 선택"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instagramChannels.map(ch => (
                                                <SelectItem key={ch.id} value={ch.id}>
                                                    {ch.nickname || ch.id} ({ch.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>캡션</Label>
                                    <Textarea
                                        value={formData.platform_configs.instagram.caption}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                instagram: { ...formData.platform_configs.instagram, caption: e.target.value }
                                            }
                                        })}
                                        placeholder="Instagram Reels 캡션..."
                                        rows={3}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.platform_configs.instagram.share_to_feed}
                                        onCheckedChange={(checked) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                instagram: { ...formData.platform_configs.instagram, share_to_feed: !!checked }
                                            }
                                        })}
                                    />
                                    <Label>피드에도 공유</Label>
                                </div>

                            </div>
                        )
                    }

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            취소
                        </Button>
                        <Button type="submit">
                            {initialData ? '수정 완료' : '추가'}
                        </Button>
                    </div>
                </form >
            </DialogContent >
        </Dialog >
    );
};

export default WorkQueue;
