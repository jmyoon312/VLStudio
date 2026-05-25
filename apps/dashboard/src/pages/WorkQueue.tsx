import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
    Upload, FileVideo, Workflow, Image, CheckCircle, XCircle, Clock,
    Play, Pause, Trash2, Edit, Eye, Youtube, Send, Settings, RotateCcw, AlertTriangle,
    Shield, Fingerprint, Activity, Clock4
} from 'lucide-react';

const WorkQueue = () => {
    const { toast } = useToast();
    const [queueItems, setQueueItems] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [activeTab, setActiveTab] = useState('queued');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isBulkShieldOpen, setIsBulkShieldOpen] = useState(false);
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);
    const [playingItem, setPlayingItem] = useState<any>(null);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [wsConnections, setWsConnections] = useState<Map<number, WebSocket>>(new Map());
    
    // [NEW] Filters and Pagination
    const [dateFilter, setDateFilter] = useState('all');
    const [limit, setLimit] = useState(20);

    // === 데이터 로딩 ===
    useEffect(() => {
        loadQueueItems();
        loadStats();
        const interval = setInterval(() => {
            loadQueueItems();
            loadStats();
        }, 5000); // 5초마다 새로고침
        return () => clearInterval(interval);
    }, [activeTab, dateFilter, limit]);

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
                    activeTab === 'verifying' ? 'VERIFYING' :
                        activeTab === 'completed' ? 'COMPLETED' :
                            activeTab === 'failed_review' ? 'FAILED_REVIEW' : null;

            let url = `/api/work-queue/items?limit=${limit}&date_filter=${dateFilter}`;
            if (statusFilter) url += `&status=${statusFilter}`;

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
    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            'QUEUED': { variant: 'secondary', icon: Clock, text: '대기 중' },
            'UPLOADING': { variant: 'default', icon: Upload, text: '업로드 중' },
            'VERIFYING': { variant: 'warning', icon: Clock4, text: '검증 중(대기)' },
            'COMPLETED': { variant: 'success', icon: CheckCircle, text: '완료' },
            'FAILED': { variant: 'destructive', icon: XCircle, text: '실패' },
            'FAILED_REVIEW': { variant: 'destructive', icon: Shield, text: '검증 실패' }
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

    const getApprovalBadge = (approvalStatus: string) => {
        const variants: Record<string, any> = {
            'PENDING': { variant: 'outline', text: '승인 대기' },
            'APPROVED': { variant: 'success', text: '승인됨' },
            'REJECTED': { variant: 'destructive', text: '반려됨' },
            'AUTO_APPROVED': { variant: 'secondary', text: '자동 승인' }
        };
        const config = variants[approvalStatus] || variants['PENDING'];
        return <Badge variant={config.variant}>{config.text}</Badge>;
    };

    // === 승인/반려 ===
    const handleApprove = async (itemId: number) => {
        try {
            await fetchWithRetry('/api/work-queue/batch/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_ids: [itemId], approved_by: 'user' })
            });
            toast({ title: "승인 완료", description: "작업이 승인되어 대기열에 추가되었습니다." });
            loadQueueItems();
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "승인 처리 실패" });
        }
    };

    const handleReject = async (itemId: number, reason: string) => {
        try {
            await fetchWithRetry('/api/work-queue/batch/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_ids: [itemId], reason })
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
        <div className="p-8 space-y-6 bg-background text-foreground min-h-screen">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight">자동화 작업 대기열</h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">인간 개입(HITL) 및 팩토리 승인 대기열 관리</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
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
                <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500/20 p-2 rounded-full relative">
                            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                        </div>
                        <div>
                            <h3 className="font-bold text-orange-600 dark:text-orange-400">긴급 검수 대기 중 (HITL)</h3>
                            <p className="text-sm text-muted-foreground">에이전트가 렌더링 직전 인간 디렉터의 승인을 기다리며 프로세스를 일시 정지(Suspend)했습니다.</p>
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
            <BulkShieldDialog
                isOpen={isBulkShieldOpen}
                setIsOpen={setIsBulkShieldOpen}
                onSuccess={() => {
                    setSelectedItems([]);
                    loadQueueItems();
                }}
                selectedItems={selectedItems}
            />

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard title="전체" value={stats.total || 0} icon={FileVideo} />
                <StatCard title="대기 중" value={stats.queued || 0} icon={Clock} color="blue" />
                <StatCard title="업로드 중" value={stats.uploading || 0} icon={Upload} color="yellow" />
                <StatCard title="검증 중" value={stats.verifying || 0} icon={Clock4} color="orange" />
                <StatCard title="완료" value={stats.completed || 0} icon={CheckCircle} color="green" />
                <StatCard title="실패" value={stats.failed || 0} icon={XCircle} color="red" />
            </div>

            {/* 일괄 작업 툴바 */}
            {selectedItems.length > 0 && (
                <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedItems.length === queueItems.length}
                                    onCheckedChange={toggleAllSelection}
                                />
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {selectedItems.length}개 선택됨
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => setIsBulkShieldOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white mr-2"
                                >
                                    <Shield className="w-4 h-4 mr-1" />
                                    방어 체계 일괄 적용
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleBatchApprove}
                                    className="bg-green-600 hover:bg-green-700 text-white"
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
                                    className="border-border text-foreground"
                                >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    일괄 삭제
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleBatchReset}
                                    className="bg-muted hover:bg-accent text-muted-foreground"
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
                {/* 탭 및 필터 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <TabsList className="bg-muted border border-border flex-wrap h-auto">
                    <TabsTrigger value="queued">대기열 ({stats.queued || 0})</TabsTrigger>
                    <TabsTrigger value="uploading">진행 중 ({stats.uploading || 0})</TabsTrigger>
                    <TabsTrigger value="verifying">검증 중 ({stats.verifying || 0})</TabsTrigger>
                    <TabsTrigger value="completed">완료됨 ({stats.completed || 0})</TabsTrigger>
                    <TabsTrigger value="failed_review">검증실패 ({stats.failed_review || 0})</TabsTrigger>
                    <TabsTrigger value="all">전체</TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap text-muted-foreground">기간:</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[120px] h-9 bg-background">
                            <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">오늘</SelectItem>
                            <SelectItem value="week">최근 7일</SelectItem>
                            <SelectItem value="month">최근 30일</SelectItem>
                            <SelectItem value="all">전체 기간</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

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
                                    onEdit={(item: any) => {
                                        setEditingItem(item);
                                        setIsAddDialogOpen(true);
                                    }}
                                    onPlay={(item: any) => {
                                        setPlayingItem(item);
                                        setIsPlayerOpen(true);
                                    }}
                                    getStatusBadge={getStatusBadge}
                                    getApprovalBadge={getApprovalBadge}
                                    selectedItems={selectedItems}
                                    toggleItemSelection={toggleItemSelection}
                                />
                            ))}
                            
                            {/* [NEW] Load More Button */}
                            {queueItems.length >= limit && (
                                <Button 
                                    variant="outline" 
                                    className="w-full mt-4" 
                                    onClick={() => setLimit(prev => prev + 20)}
                                >
                                    더 보기 (현재 {queueItems.length}개)
                                </Button>
                            )}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

// === 통계 카드 ===
const StatCard = ({ title, value, icon: Icon, color = 'slate' }: { title: string; value: number; icon: any; color?: string; }) => {
    const colors = {
        slate: 'bg-muted text-muted-foreground',
        blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        yellow: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        red: 'bg-destructive/10 text-destructive'
    };

    return (
        <Card className="bg-card border-border">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${(colors as Record<string, string>)[color]}`}>
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
        <Card 
            className="hover:shadow-md transition-shadow bg-card border-border select-none"
            onMouseEnter={(e) => {
                if (e.buttons === 1 && !selectedItems.includes(item.id)) {
                    toggleItemSelection(item.id);
                }
            }}
        >
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            className="mt-1 border-border"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                                {getStatusBadge(item.status)}
                                {getApprovalBadge(item.approval_status)}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <FileVideo className="w-4 h-4" />
                                    {item.source_type || 'MANUAL'}
                                </span>
                                <span className="flex items-center gap-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400" onClick={() => onPlay(item)}>
                                    <Play className="w-3 h-3" />
                                    미리보기
                                </span>
                                <span>생성: {new Date(item.created_at).toLocaleString('ko-KR')}</span>
                                {item.upload_completed_at && (
                                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <CheckCircle className="w-3 h-3" /> 비공개 업로드: {new Date(item.upload_completed_at).toLocaleString('ko-KR')}
                                    </span>
                                )}
                                {item.published_at && (
                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                        <Send className="w-3 h-3" /> 최종 배포: {new Date(item.published_at).toLocaleString('ko-KR')}
                                    </span>
                                )}
                                {item.target_platforms && (
                                    <span className="flex items-center gap-1">
                                        {item.target_platforms.map((platform: string) => (
                                            <Badge key={platform} variant="outline" className="text-xs border-border">
                                                {platform}
                                            </Badge>
                                        ))}
                                    </span>
                                )}
                                {item.platform_configs?.youtube?.anti_association?.enabled && (
                                    <span className="flex items-center gap-1 border-l pl-3 ml-1 border-border">
                                        {item.platform_configs.youtube.anti_association.mutation_intensity !== '0.0' && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-5" title={`알고리즘 교란 (${item.platform_configs.youtube.anti_association.mutation_intensity})`}><Shield className="w-3 h-3 mr-1" />교란</Badge>}
                                        {item.platform_configs.youtube.anti_association.dynamic_seo && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-5" title="AI 동적 SEO"><Activity className="w-3 h-3 mr-1" />SEO</Badge>}
                                        {item.platform_configs.youtube.anti_association.jitter_jumps && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-5" title="업로드 지연 (Jitter)"><Clock4 className="w-3 h-3 mr-1" />지연</Badge>}
                                        {item.platform_configs.youtube.anti_association.metadata_scrub && <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-5" title="메타데이터 파괴"><Fingerprint className="w-3 h-3 mr-1" />Scrub</Badge>}
                                    </span>
                                )}
                            </div>

                            {item.status === 'UPLOADING' && (
                                <div className="mt-3">
                                    <div className="flex items-center justify-between text-sm mb-1 text-muted-foreground">
                                        <span>업로드 진행률</span>
                                        <span className="font-medium text-foreground">{item.upload_progress}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${item.upload_progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {isExpanded && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm text-muted-foreground border border-border">
                                    <p><strong className="text-foreground">설명:</strong> {item.description || '없음'}</p>
                                    <p><strong className="text-foreground">파일 경로:</strong> {item.video_file_path}</p>
                                    <p><strong className="text-foreground">업로드 방식:</strong> {item.upload_method || 'API'}</p>
                                    {item.failure_reason && (
                                        <p className="text-destructive"><strong className="text-foreground">실패 사유:</strong> {item.failure_reason}</p>
                                    )}
                                    <div className="pt-2 border-t border-border mt-2">
                                        <p className="text-xs text-muted-foreground">전체 데이터 확인</p>
                                        <div className="grid grid-cols-2 gap-4 mt-1">
                                            <div>
                                                <span className="text-xs font-semibold block text-muted-foreground">업로드 방식</span>
                                                <Badge variant={item.upload_method === 'BROWSER_AUTO' ? 'default' : 'secondary'} className="mt-0.5">
                                                    {item.upload_method === 'BROWSER_AUTO' ? '브라우저 자동화 (Anti-Detect)' : '공식 API'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold block text-muted-foreground">공개 설정</span>
                                                {/* Platform Configs Check */}
                                                <span className="text-sm text-foreground">
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
                                    <Button size="sm" onClick={() => onApprove(item.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        승인
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => onReject(item.id, '품질 미달')}>
                                        <XCircle className="w-4 h-4 mr-1" />
                                        반려
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="outline" onClick={() => onEdit(item)} className="border-border text-foreground">
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsExpanded(!isExpanded)} className="border-border text-foreground">
                                <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDelete(item.id)} className="border-border text-foreground">
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
    <Card className="bg-card border-border">
        <CardContent className="p-12 text-center">
            <FileVideo className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">대기열이 비어있습니다</h3>
            <p className="text-muted-foreground">영상을 추가하여 업로드를 시작하세요</p>
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
            <DialogContent className="max-w-4xl bg-black p-1 border-border">
                <DialogHeader className="sr-only">
                    <DialogTitle>{item.title}</DialogTitle>
                    <DialogDescription>{item.video_file_path}</DialogDescription>
                </DialogHeader>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full"
                        onError={(e) => console.error("Video load error", e)}
                    />
                </div>
                <div className="p-4 bg-card text-foreground border border-border rounded-b-lg">
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{item.video_file_path}</p>
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
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

    // Default State
    const defaultState = {
        title: '',
        description: '',
        hashtags: '', // [NEW] Separate Hashtags
        tags: '',     // Hidden Tags
        video_file_path: '',
        enable_shopping_tag: false,
        shopping_tag_keyword: '',
        source_type: 'MANUAL',
        approval_required: false,
        upload_method: 'BROWSER_AUTO',
        target_platforms: ['youtube'],
        platform_configs: {
            youtube: {
                channel_id: '',
                privacy: 'private',
                category: '22',
                made_for_kids: false,
                headless_mode: false,
                anti_association: {
                    enabled: true,
                    metadata_scrub: true,
                    dynamic_seo: true,
                    jitter_jumps: true,
                    smart_routing: true,
                    mutation_intensity: '0.5'
                }
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
                    scheduledTime: initialData.scheduled_upload_time 
                        ? (initialData.scheduled_upload_time.includes('T') ? initialData.scheduled_upload_time : initialData.scheduled_upload_time.replace(' ', 'T')).slice(0, 16)
                        : ''
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

    const extractShoppingKeyword = async () => {
        if (!formData.title && !formData.description) {
            toast({ variant: "destructive", title: "입력 오류", description: "제목이나 설명을 먼저 입력해주세요." });
            return;
        }

        setIsGeneratingMetadata(true);
        try {
            const response = await fetchWithRetry('/api/work-queue/extract-shopping-keyword', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title || "",
                    description: formData.description || ""
                })
            });
            const data = await response.json();
            
            if (data.keyword) {
                setFormData(prev => ({ ...prev, shopping_tag_keyword: data.keyword }));
                toast({ title: "키워드 추출 성공", description: `"${data.keyword}" 키워드가 추출되었습니다.` });
            } else {
                setFormData(prev => ({ ...prev, shopping_tag_keyword: '' }));
                toast({ title: "추출 실패", description: "관련된 쇼핑 키워드를 찾을 수 없습니다. (NONE 반환됨)" });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "오류", description: "AI 키워드 추출 중 오류가 발생했습니다." });
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (isGeneratingMetadata) {
            toast({ variant: "destructive", title: "작업 중", description: "AI 분석이 진행 중입니다. 잠시 후 다시 시도해주세요." });
            return;
        }

        if (!formData.title.trim()) {
            toast({ variant: "destructive", title: "입력 오류", description: "제목을 입력해주세요." });
            return;
        }
        if (!formData.video_file_path.trim()) {
            toast({ variant: "destructive", title: "입력 오류", description: "영상 파일 경로를 입력해주세요." });
            return;
        }
        if (formData.target_platforms.includes('youtube') && !formData.platform_configs.youtube.channel_id) {
            toast({ variant: "destructive", title: "입력 오류", description: "YouTube 채널을 선택해주세요." });
            return;
        }
        if (formData.target_platforms.includes('tiktok') && !formData.platform_configs.tiktok.account_id) {
            toast({ variant: "destructive", title: "입력 오류", description: "TikTok 계정을 선택해주세요." });
            return;
        }
        if (formData.target_platforms.includes('instagram') && !formData.platform_configs.instagram.account_id) {
            toast({ variant: "destructive", title: "입력 오류", description: "Instagram 계정을 선택해주세요." });
            return;
        }
        if (formData.target_platforms.length === 0) {
            toast({ variant: "destructive", title: "입력 오류", description: "최소 하나 이상의 대상 플랫폼을 선택해주세요." });
            return;
        }

        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                hashtags: formData.hashtags.split(/[ ,]+/).map(t => t.startsWith('#') ? t : `#${t}`).filter(t => t.length > 1),
                scheduled_upload_time: formData.uploadScheduleMode === 'scheduled' ? formData.scheduledTime : null
            };

            const url = initialData ? `/api/work-queue/items/${initialData.id}` : '/api/work-queue/items';
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

    const handleAiAutoFill = async () => {
        try {
            if (!formData.video_file_path || !formData.video_file_path.trim()) {
                toast({ variant: "destructive", title: "입력 오류", description: "영상 파일 경로를 먼저 입력해주세요." });
                return;
            }
            
            setIsGeneratingMetadata(true);
            toast({ title: "AI 분석 시작", description: "영상의 자막을 추출하고 메타데이터를 생성 중입니다. (약 30초~1분 소요)" });
            
            // Pick primary platform for context
            const primaryPlatform = formData.target_platforms && formData.target_platforms.length > 0 
                ? formData.target_platforms[0] 
                : 'youtube';
                
            const response = await fetchWithRetry('/api/work-queue/generate-metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    video_path: formData.video_file_path,
                    platform: primaryPlatform
                })
            });
            
            const text = await response.text(); // Read text first to catch HTML errors
            console.log("AI Backend Response:", text);
            
            if (response.ok) {
                try {
                    const data = JSON.parse(text);
                    if (data.success && data.metadata) {
                        const meta = data.metadata;
                        setFormData(prev => ({
                            ...prev,
                            title: meta.title || prev.title,
                            description: meta.description || meta.caption || prev.description,
                            hashtags: meta.hashtags ? meta.hashtags.join(' ') : prev.hashtags,
                            tags: meta.tags ? meta.tags.join(', ') : prev.tags
                        }));
                        toast({ title: "분석 완료", description: "AI가 제목, 설명, 해시태그를 성공적으로 채웠습니다!" });
                    } else {
                        toast({ variant: "destructive", title: "분석 실패", description: "메타데이터를 생성하지 못했습니다." });
                    }
                } catch (e) {
                    console.error("JSON parse error:", e);
                    toast({ variant: "destructive", title: "응답 오류", description: "서버가 올바른 JSON 데이터를 반환하지 않았습니다." });
                }
            } else {
                let errorMsg = "AI 분석 중 오류가 발생했습니다.";
                try {
                    const error = JSON.parse(text);
                    errorMsg = error.detail || errorMsg;
                } catch (e) {
                    errorMsg = `서버 에러 (${response.status}): ${text.substring(0, 100)}...`;
                }
                toast({ variant: "destructive", title: "오류", description: errorMsg });
            }
        } catch (error: any) {
            console.error("AI Auto Fill Exception:", error);
            toast({ variant: "destructive", title: "통신 오류", description: error?.message || "서버와 연결할 수 없습니다." });
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
                <DialogHeader>
                    <DialogTitle className="text-foreground">{initialData ? '작업 대기열 수정' : '작업 대기열에 영상 추가'}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        업로드할 영상의 정보를 입력하고 대상 플랫폼을 선택하세요.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4 bg-muted border border-border">
                            <TabsTrigger value="basic">📝 기본 정보</TabsTrigger>
                            <TabsTrigger value="upload">⚙️ 업로드 설정</TabsTrigger>
                            <TabsTrigger value="platform">🛡️ 플랫폼 & 방어</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-4 mt-0">
                    {/* 기본 정보 */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                        <h3 className="font-semibold text-sm text-foreground">기본 정보</h3>

                        <div>
                            <Label className="text-foreground">제목 *</Label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="bg-background text-foreground border-border"
                            />
                        </div>

                        <div>
                            <Label className="text-foreground">설명</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={8}
                                placeholder="영상 설명을 입력하세요."
                                className="bg-background text-foreground border-border"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-foreground">해시태그 (설명에 포함)</Label>
                                <Input
                                    value={formData.hashtags}
                                    onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                                    placeholder="#Shorts #Viral #Tending"
                                    className="bg-background text-foreground border-border"
                                />
                                <p className="text-xs text-muted-foreground mt-1">공백으로 구분, 자동으로 # 붙음</p>
                            </div>
                            <div>
                                <Label className="text-foreground">태그 (메타데이터, 쉼표 구분)</Label>
                                <Input
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="shorts, viral, 추천"
                                    className="bg-background text-foreground border-border"
                                />
                            </div>
                        </div>
                        
                        {/* Shopping Tag */}
                        <div className="pt-4 mt-4 border-t border-border">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Label className="text-foreground text-base">🛍️ 쇼핑 태그 자동 등록 (쿠팡 등)</Label>
                                    <p className="text-xs text-muted-foreground mt-1">업로드 시 유튜브 스튜디오에 상품을 자동 태그합니다. (Shorts는 모바일 앱에서 스티커 위치 이동 가능)</p>
                                </div>
                                <Switch
                                    checked={formData.enable_shopping_tag}
                                    onCheckedChange={(c) => setFormData({ ...formData, enable_shopping_tag: c })}
                                />
                            </div>

                            {formData.enable_shopping_tag && (
                                <div className="space-y-2 bg-muted/30 p-4 rounded-lg">
                                    <Label className="text-foreground">매칭할 상품 키워드</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.shopping_tag_keyword}
                                            onChange={(e) => setFormData({ ...formData, shopping_tag_keyword: e.target.value })}
                                            placeholder="예: 캠핑 의자, 스마트폰 거치대"
                                            className="bg-background text-foreground border-border"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="secondary" 
                                            onClick={extractShoppingKeyword}
                                            disabled={isGeneratingMetadata}
                                            className="shrink-0"
                                        >
                                            {isGeneratingMetadata ? "분석 중..." : "✨ AI 키워드 자동 추출"}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        * 빈칸으로 두면 AI가 자동으로 추출합니다. 
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label className="text-foreground">영상 파일 경로 *</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.video_file_path}
                                    onChange={(e) => setFormData({ ...formData, video_file_path: e.target.value })}
                                    placeholder="F:\download\video.mp4"
                                    className="bg-background text-foreground border-border"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            // 1. Electron Desktop 환경인 경우 네이티브 탐색기 호출
                                            if ((window as any).electronAPI && (window as any).electronAPI.selectVideoFile) {
                                                const result = await (window as any).electronAPI.selectVideoFile();
                                                if (result.success && result.path) {
                                                    setFormData({ ...formData, video_file_path: result.path });
                                                }
                                                return; // Electron에서 성공적으로 처리했으면 종료
                                            }
                                        } catch (e) {
                                            console.error("Electron file picker failed:", e);
                                        }

                                        // 2. 브라우저 환경인 경우 Fallback
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'video/*';
                                        input.onchange = (e: any) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const path = (file as any).path || file.name;
                                                setFormData({ ...formData, video_file_path: path });
                                                if (!(file as any).path) {
                                                    toast({ variant: "destructive", title: "경로 주의", description: "브라우저 환경이므로 절대 경로(C:\\...)를 수동으로 입력해주세요." });
                                                }
                                            }
                                        };
                                        input.click();
                                    }}
                                    className="border-border text-foreground"
                                >
                                    탐색기 열기
                                </Button>
                            </div>
                        </div>

                        {/* AI button simplified */}
                        {formData.video_file_path && (
                            <div className="flex justify-end">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleAiAutoFill} 
                                    disabled={isGeneratingMetadata}
                                    className="border-primary text-primary hover:bg-primary/10 transition-colors"
                                >
                                    {isGeneratingMetadata ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            분석 중...
                                        </span>
                                    ) : "✨ AI 자동 채우기"}
                                </Button>
                            </div>
                        )}
                    </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-4 mt-0">
                    {/* 유입 경로 및 업로드 설정 */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
                        <h3 className="font-semibold text-sm text-foreground">업로드 설정</h3>

                        <div>
                            <Label className="text-foreground">유입 경로</Label>
                            <Select value={formData.source_type} onValueChange={(value) => setFormData({ ...formData, source_type: value })}>
                                <SelectTrigger className="bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-card text-foreground border-border">
                                    <SelectItem value="MANUAL">수동 업로드</SelectItem>
                                    <SelectItem value="WORKFLOW">워크플로우</SelectItem>
                                    <SelectItem value="SCRIPT_REMIX">스크립트 리믹스</SelectItem>
                                    <SelectItem value="GALLERY_EXPORT">갤러리 내보내기</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-foreground">업로드 방식</Label>
                            <Select value={formData.upload_method} onValueChange={(value) => setFormData({ ...formData, upload_method: value })}>
                                <SelectTrigger className="bg-background text-foreground border-border"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-card text-foreground border-border">
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
                                className="border-border"
                            />
                            <Label htmlFor="approval_required" className="cursor-pointer text-foreground">검토 필요 (체크 해제 시 자동 순차 업로드)</Label>
                        </div>
                    </div >

                    {/* [NEW] 업로드 일정 (Schedule) */}
                    <div className="space-y-4 pt-4 border-t border-border" >
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                                        className="w-4 h-4 text-blue-600 border-border focus:ring-blue-500 bg-background"
                                    />
                                    <Label htmlFor="schedule-immediate" className="font-normal cursor-pointer text-foreground">⚡ 즉시 업로드</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="schedule-later"
                                        name="schedule"
                                        value="scheduled"
                                        checked={formData.uploadScheduleMode === 'scheduled'}
                                        onChange={() => {
                                            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                                            const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
                                            setFormData({ 
                                                ...formData, 
                                                uploadScheduleMode: 'scheduled',
                                                // 사용자가 라디오 버튼을 클릭하는 시점에 항상 현재 시간으로 초기화 (과거 시간 잔존 방지)
                                                scheduledTime: localISOTime
                                            });
                                        }}
                                        className="w-4 h-4 text-blue-600 border-border focus:ring-blue-500 bg-background"
                                    />
                                    <Label htmlFor="schedule-later" className="font-normal cursor-pointer text-foreground">📅 예약 업로드 (날짜 지정)</Label>
                                </div>
                            </div>

                            {formData.uploadScheduleMode === 'scheduled' && (
                                <div className="flex flex-col gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md animate-in fade-in slide-in-from-top-1">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs text-blue-600 dark:text-blue-400 font-semibold">업로드 예정 일시</Label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                            onClick={() => {
                                                const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                                                const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
                                                setFormData({ ...formData, scheduledTime: localISOTime });
                                            }}
                                        >
                                            ⏰ 현재 시각으로 리셋
                                        </Button>
                                    </div>
                                    <Input
                                        type="datetime-local"
                                        value={formData.scheduledTime}
                                        onChange={(e) => {
                                            setFormData({ ...formData, scheduledTime: e.target.value });
                                        }}
                                        className="bg-background text-foreground border-border"
                                        min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                    />
                                    <p className="text-xs text-blue-600 dark:text-blue-400">
                                        * 유튜브 정책에 맞춰 15분 단위(정각, 15분, 30분, 45분)로 자동 예약됩니다.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div >
                    </TabsContent>

                    <TabsContent value="platform" className="space-y-4 mt-0">
                    {/* 플랫폼 선택 */}
                    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border" >
                        <h3 className="font-semibold text-sm text-foreground">대상 플랫폼</h3>
                        <div className="flex gap-4">
                            {['youtube', 'tiktok', 'instagram'].map(platform => (
                                <label key={platform} className="flex items-center gap-2 text-foreground">
                                    <Checkbox
                                        checked={formData.target_platforms.includes(platform)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setFormData({ ...formData, target_platforms: [...formData.target_platforms, platform] });
                                            } else {
                                                setFormData({ ...formData, target_platforms: formData.target_platforms.filter(p => p !== platform) });
                                            }
                                        }}
                                        className="border-border"
                                    />
                                    <span className="capitalize">{platform}</span>
                                </label>
                            ))}
                        </div>
                    </div >

                    {/* YouTube 설정 */}
                    {
                        formData.target_platforms.includes('youtube') && (
                            <div className="space-y-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                    <Youtube className="w-4 h-4" />
                                    YouTube 설정
                                </h3>

                                <div>
                                    <Label className="text-foreground">채널 선택 *</Label>
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
                                        <SelectTrigger className="bg-background text-foreground border-border">
                                            <SelectValue placeholder={
                                                channels.length === 0
                                                    ? (formData.upload_method === 'API'
                                                        ? "소유한 채널이 없습니다"
                                                        : "위임받은 채널이 없습니다")
                                                    : "채널을 선택하세요"
                                            } />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card text-foreground border-border">
                                            {channels.length === 0 ? (
                                                <div className="p-4 text-sm text-muted-foreground text-center">
                                                    {formData.upload_method === 'API'
                                                        ? "일반 계정에 소유한 브랜드 채널이 없습니다."
                                                        : "관리자 계정에 위임받은 브랜드 채널이 없습니다."}
                                                </div>
                                            ) : (
                                                channels.map(channel => (
                                                    <SelectItem key={channel.channel_id} value={channel.channel_id}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-foreground">
                                                                {channel.channel_name || channel.title} ({channel.subscriber_count?.toLocaleString()} 구독자)
                                                            </span>
                                                            <Badge variant="outline" className="text-xs border-border text-foreground">
                                                                {formData.upload_method === 'API' ? 'OWNER' : 'MANAGER'}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formData.upload_method === 'API' ? '일반계정' : '관리자계정'}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {channels.length === 0 && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            {formData.upload_method === 'API'
                                                ? "💡 Google Accounts에서 브랜드 채널을 생성하거나 연결하세요."
                                                : "💡 Captain 계정에서 브랜드 채널 위임을 받으세요."}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="text-foreground">공개 범위</Label>
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
                                        <SelectTrigger className="bg-background text-foreground border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card text-foreground border-border">
                                            <SelectItem value="public">공개</SelectItem>
                                            <SelectItem value="unlisted">일부 공개</SelectItem>
                                            <SelectItem value="private">비공개</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="youtube_headless"
                                        checked={formData.platform_configs.youtube.headless_mode ?? false}
                                        onCheckedChange={(checked) => setFormData({
                                            ...formData,
                                            platform_configs: {
                                                ...formData.platform_configs,
                                                youtube: { ...formData.platform_configs.youtube, headless_mode: !!checked }
                                            }
                                        })}
                                        className="border-border"
                                        disabled={formData.upload_method !== 'BROWSER_AUTO'}
                                    />
                                    <Label htmlFor="youtube_headless" className="cursor-pointer text-foreground text-sm font-medium leading-none">
                                        브라우저 숨기기 (Headless Mode)
                                    </Label>
                                </div>

                            </div>
                        )
                    }

                    {/* Sovereign Shield 패널 */}
                    {
                        formData.target_platforms.includes('youtube') && (
                            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        <h3 className="font-semibold text-sm text-primary">Sovereign Shield (연좌제 방어)</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="shield_master"
                                            checked={formData.platform_configs.youtube.anti_association?.enabled}
                                            onCheckedChange={(checked) => {
                                                const boolVal = !!checked;
                                                setFormData({
                                                    ...formData,
                                                    platform_configs: {
                                                        ...formData.platform_configs,
                                                        youtube: {
                                                            ...formData.platform_configs.youtube,
                                                            anti_association: {
                                                                ...formData.platform_configs.youtube.anti_association,
                                                                enabled: boolVal,
                                                                metadata_scrub: boolVal,
                                                                dynamic_seo: boolVal,
                                                                jitter_jumps: boolVal,
                                                                smart_routing: boolVal
                                                            }
                                                        }
                                                    }
                                                });
                                            }}
                                            className="border-primary"
                                        />
                                        <Label htmlFor="shield_master" className="text-sm font-medium cursor-pointer text-primary">전체 제어</Label>
                                    </div>
                                </div>

                                {formData.platform_configs.youtube.anti_association?.enabled && (
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="shield_meta"
                                                    checked={formData.platform_configs.youtube.anti_association?.metadata_scrub}
                                                    onCheckedChange={(checked) => setFormData(prev => ({
                                                        ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, anti_association: { ...prev.platform_configs.youtube.anti_association, metadata_scrub: !!checked } } }
                                                    }))}
                                                />
                                                <Label htmlFor="shield_meta" className="cursor-pointer">메타데이터 완전 파괴 (EXIF/기기정보 삭제)</Label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="shield_seo"
                                                    checked={formData.platform_configs.youtube.anti_association?.dynamic_seo}
                                                    onCheckedChange={(checked) => setFormData(prev => ({
                                                        ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, anti_association: { ...prev.platform_configs.youtube.anti_association, dynamic_seo: !!checked } } }
                                                    }))}
                                                />
                                                <Label htmlFor="shield_seo" className="cursor-pointer">AI 동적 SEO (텍스트 군집화 회피)</Label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="shield_jitter"
                                                    checked={formData.platform_configs.youtube.anti_association?.jitter_jumps}
                                                    onCheckedChange={(checked) => setFormData(prev => ({
                                                        ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, anti_association: { ...prev.platform_configs.youtube.anti_association, jitter_jumps: !!checked } } }
                                                    }))}
                                                />
                                                <Label htmlFor="shield_jitter" className="cursor-pointer">업로드 지연 타이머 (Jitter ±15분)</Label>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="shield_routing"
                                                    checked={formData.platform_configs.youtube.anti_association?.smart_routing}
                                                    onCheckedChange={(checked) => setFormData(prev => ({
                                                        ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, anti_association: { ...prev.platform_configs.youtube.anti_association, smart_routing: !!checked } } }
                                                    }))}
                                                />
                                                <Label htmlFor="shield_routing" className="cursor-pointer">강제 IP 스와핑 (Smart Routing)</Label>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-2 border-t border-primary/10">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-primary" />
                                                    <Label htmlFor="shield_headless" className="cursor-pointer font-semibold text-primary">브라우저 숨기기 (백그라운드 실행)</Label>
                                                </div>
                                                <Switch
                                                    id="shield_headless"
                                                    checked={formData.platform_configs.youtube.headless_mode}
                                                    onCheckedChange={(checked) => setFormData(prev => ({
                                                        ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, headless_mode: !!checked } }
                                                    }))}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-4">활성화 시 브라우저 창을 띄우지 않고 백그라운드에서 조용히 업로드를 진행합니다. (탐지 위험이 약간 상승할 수 있습니다.)</p>
                                        
                                            <Label className="text-foreground mb-2 block">알고리즘 교란 엔진 (Mutation Intensity)</Label>
                                            <Select
                                                value={formData.platform_configs.youtube.anti_association?.mutation_intensity || '0.5'}
                                                onValueChange={(value) => setFormData(prev => ({
                                                    ...prev, platform_configs: { ...prev.platform_configs, youtube: { ...prev.platform_configs.youtube, anti_association: { ...prev.platform_configs.youtube.anti_association, mutation_intensity: value } } }
                                                }))}
                                            >
                                                <SelectTrigger className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0.0">교란 끄기 (위험)</SelectItem>
                                                    <SelectItem value="0.2">약함 (화질 최우선, 미세 변조)</SelectItem>
                                                    <SelectItem value="0.5">보통 (안정성 밸런스, 권장)</SelectItem>
                                                    <SelectItem value="0.8">강함 (방어력 최우선, 화질 저하)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {formData.platform_configs.youtube.anti_association?.mutation_intensity === '0.0' && '비디오 해시가 원본과 동일하게 유지되어 중복 필터링에 걸릴 수 있습니다.'}
                                                {formData.platform_configs.youtube.anti_association?.mutation_intensity === '0.2' && '인간의 눈에 보이지 않는 비가시적 노이즈만 주입합니다.'}
                                                {formData.platform_configs.youtube.anti_association?.mutation_intensity === '0.5' && '미세한 입자 노이즈와 오디오 주파수 변경으로 방어력을 높입니다.'}
                                                {formData.platform_configs.youtube.anti_association?.mutation_intensity === '0.8' && '강력한 노이즈와 왜곡 필터를 씌워 완벽히 다른 영상으로 인식시킵니다.'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* TikTok 설정 */}
                    {
                        formData.target_platforms.includes('tiktok') && (
                            <div className="space-y-4 p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
                                <h3 className="font-semibold text-sm text-pink-600 dark:text-pink-400">TikTok 설정</h3>

                                <div>
                                    <Label className="text-foreground">계정 선택 *</Label>
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
                                        <SelectTrigger className="bg-background text-foreground border-border">
                                            <SelectValue placeholder={tiktokChannels.length === 0 ? "연결된 계정이 없습니다" : "TikTok 계정 선택"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card text-foreground border-border">
                                            {tiktokChannels.map(ch => (
                                                <SelectItem key={ch.id} value={ch.id}>
                                                    {ch.nickname || ch.id} ({ch.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-foreground">공개 범위</Label>
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
                                        <SelectTrigger className="bg-background text-foreground border-border">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card text-foreground border-border">
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
                                        className="border-border"
                                    />
                                    <Label className="text-foreground">댓글 허용</Label>
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
                                        className="border-border"
                                    />
                                    <Label className="text-foreground">듀엣 허용</Label>
                                </div>

                            </div>
                        )
                    }

                    {/* Instagram 설정 */}
                    {
                        formData.target_platforms.includes('instagram') && (
                            <div className="space-y-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <h3 className="font-semibold text-sm text-purple-600 dark:text-purple-400">Instagram 설정</h3>

                                <div>
                                    <Label className="text-foreground">계정 선택 *</Label>
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
                                        <SelectTrigger className="bg-background text-foreground border-border">
                                            <SelectValue placeholder={instagramChannels.length === 0 ? "연결된 계정이 없습니다" : "Instagram 계정 선택"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card text-foreground border-border">
                                            {instagramChannels.map(ch => (
                                                <SelectItem key={ch.id} value={ch.id}>
                                                    {ch.nickname || ch.id} ({ch.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-foreground">캡션</Label>
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
                    </TabsContent>
                    </Tabs>

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

const BulkShieldDialog = ({ isOpen, setIsOpen, onSuccess, selectedItems }: any) => {
    const { toast } = useToast();
    const [shieldConfigs, setShieldConfigs] = useState({
        anti_association: {
            enabled: true,
            metadata_scrub: true,
            dynamic_seo: true,
            jitter_jumps: true,
            smart_routing: true,
            mutation_intensity: '0.5'
        },
        headless_mode: false
    });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/work-queue/batch/shield', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_ids: selectedItems,
                    shield_configs: shieldConfigs
                })
            });
            if (res.ok) {
                toast({ title: '성공', description: '선택한 항목들에 방어 체계가 일괄 적용되었습니다.' });
                setIsOpen(false);
                if (onSuccess) onSuccess();
            } else {
                toast({ variant: 'destructive', title: '오류', description: '일괄 적용에 실패했습니다.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: '에러', description: '서버와 통신할 수 없습니다.' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-xl bg-card text-foreground border-border">
                <DialogHeader>
                    <DialogTitle>🛡️ 방어 체계 일괄 적용</DialogTitle>
                    <DialogDescription>선택한 {selectedItems.length}개의 항목에 설정을 적용합니다.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h3 className="font-semibold text-sm text-primary">Sovereign Shield (연좌제 방어)</h3>
                            </div>
                            <Switch
                                checked={shieldConfigs.anti_association.enabled}
                                onCheckedChange={(c) => setShieldConfigs({ ...shieldConfigs, anti_association: { ...shieldConfigs.anti_association, enabled: !!c, metadata_scrub: !!c, dynamic_seo: !!c, jitter_jumps: !!c, smart_routing: !!c } })}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                        {shieldConfigs.anti_association.enabled && (
                            <div className="space-y-4 pt-2">
                                {[
                                    { id: 'meta', key: 'metadata_scrub', label: '메타데이터 완전 파괴 (EXIF/기기정보 삭제)' },
                                    { id: 'seo', key: 'dynamic_seo', label: 'AI 동적 SEO (텍스트 군집화 회피)' },
                                    { id: 'jitter', key: 'jitter_jumps', label: '업로드 지연 타이머 (Jitter ±15분)' },
                                    { id: 'routing', key: 'smart_routing', label: '강제 IP 스와핑 (Smart Routing)' },
                                ].map((opt) => (
                                    <div key={opt.id} className="flex items-center justify-between">
                                        <Label htmlFor={`bshield_${opt.id}`} className="cursor-pointer">{opt.label}</Label>
                                        <Checkbox
                                            id={`bshield_${opt.id}`}
                                            checked={(shieldConfigs.anti_association as any)[opt.key]}
                                            onCheckedChange={(c) => setShieldConfigs({ ...shieldConfigs, anti_association: { ...shieldConfigs.anti_association, [opt.key]: !!c } })}
                                        />
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-primary/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label htmlFor="bshield_headless" className="cursor-pointer font-semibold text-primary flex items-center gap-2">
                                            <Eye className="w-4 h-4" /> 브라우저 숨기기 (백그라운드 실행)
                                        </Label>
                                        <Switch
                                            id="bshield_headless"
                                            checked={shieldConfigs.headless_mode}
                                            onCheckedChange={(c) => setShieldConfigs({ ...shieldConfigs, headless_mode: !!c })}
                                        />
                                    </div>
                                    <Label className="text-foreground mb-2 block mt-4">알고리즘 교란 엔진 (Mutation Intensity)</Label>
                                    <Select value={shieldConfigs.anti_association.mutation_intensity} onValueChange={(v) => setShieldConfigs({ ...shieldConfigs, anti_association: { ...shieldConfigs.anti_association, mutation_intensity: v } })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.0">끄기 (원본 유지)</SelectItem>
                                            <SelectItem value="0.5">보통 (안정성 밸런스)</SelectItem>
                                            <SelectItem value="0.8">강함 (최대 방어, 화질 저하)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>취소</Button>
                        <Button type="submit">일괄 적용하기</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default WorkQueue;
