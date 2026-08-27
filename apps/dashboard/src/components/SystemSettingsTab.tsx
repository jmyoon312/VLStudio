import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, RefreshCw, Save, Database, Folder, Trash2, RotateCcw, Bot, HardDrive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface SystemSettings {
    general: {
        language: string;
        theme: string;
        notifications: boolean;
    };
    rate_limiting: {
        mode: 'SAFE' | 'BALANCED' | 'AGGRESSIVE';
        requests_per_minute: number;
        rate_limit_window: number;
        circuit_breaker_threshold: number;
        enabled: boolean;
        enable_view_stats_collection: boolean;
    };
    maintenance: {
        auto_cleanup: boolean;
        cleanup_interval_days: number;
        backup_enabled: boolean;
    };
}

interface BackupFile {
    filename: string;
    size_kb: number;
    created_at: string;
}

interface BackupListData {
    backups: BackupFile[];
    total_count: number;
    total_size_kb: number;
    backup_dir: string;
}

export function SystemSettingsTab() {
    const queryClient = useQueryClient();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [deletingFile, setDeletingFile] = useState<string | null>(null);

    // 시스템 설정 조회
    const { data: settings, isLoading, error } = useQuery<SystemSettings>({
        queryKey: ['systemSettings'],
        queryFn: async () => {
            const response = await api.get('/settings/system');
            return response.data;
        }
    });

    // 백업 목록 조회
    const { data: backupList, refetch: refetchBackups } = useQuery<BackupListData>({
        queryKey: ['backupList'],
        queryFn: async () => {
            const response = await api.get('/system/backup-list');
            return response.data;
        },
        refetchInterval: false,
    });

    // 유지보수 설정 업데이트
    const updateMaintenanceMutation = useMutation({
        mutationFn: (data: any) => api.put('/settings/maintenance', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
            toast.success('유지보수 설정이 저장되었습니다.');
        },
        onError: (err: any) => {
            toast.error(`저장 실패: ${err.message}`);
        }
    });

    // 조회수 수집 토글
    const updateViewStatsMutation = useMutation({
        mutationFn: (data: any) => api.put('/settings/rate-limiting', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
            toast.success('설정이 저장되었습니다.');
        },
        onError: (err: any) => {
            toast.error(`저장 실패: ${err.message}`);
        }
    });

    const handleMaintenanceChange = (key: string, value: any) => {
        if (!settings) return;
        updateMaintenanceMutation.mutate({
            ...settings.maintenance,
            [key]: value
        });
    };

    const handleBackupNow = async () => {
        setIsBackingUp(true);
        try {
            const res = await api.post('/system/backup-database');
            if (res.data.ok) {
                toast.success(res.data.message);
                refetchBackups();
            } else {
                toast.error('백업 실패');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || e?.message || '백업 중 오류 발생');
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleOpenBackupFolder = async () => {
        try {
            await api.post('/system/open-backup-folder');
        } catch {
            toast.error('폴더 열기 실패');
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        setDeletingFile(filename);
        try {
            const res = await api.delete(`/system/delete-backup/${encodeURIComponent(filename)}`);
            if (res.data.ok) {
                toast.success(res.data.message);
                refetchBackups();
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || '삭제 실패');
        } finally {
            setDeletingFile(null);
        }
    };

    const handleResetConfirmed = async () => {
        setIsResetting(true);
        try {
            const res = await api.post('/system/reset-database');
            if (res.data.ok) {
                toast.success(res.data.message, { duration: 6000 });
                refetchBackups();
            } else {
                toast.error('초기화 실패');
            }
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || '초기화 중 오류');
        } finally {
            setIsResetting(false);
            setIsResetDialogOpen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">로딩 중...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>오류</AlertTitle>
                <AlertDescription>시스템 설정을 불러오지 못했습니다</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">시스템 설정</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    자동화 전략, 데이터 유지보수 및 백업 정책을 설정합니다.
                </p>
            </div>

            {/* 자동화 엔진 운영 정책 안내 배너 */}
            <Alert className="border-sky-200 dark:border-sky-500/30 bg-sky-50/80 dark:bg-sky-950/25 rounded-2xl shadow-2xs">
                <Bot className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <AlertTitle className="text-sky-900 dark:text-sky-200 font-bold text-sm">자동화 엔진은 스스로 최적화됩니다</AlertTitle>
                <AlertDescription className="text-xs text-sky-800/90 dark:text-sky-300/80 mt-1 leading-relaxed">
                    다운로드 속도 제한(Rate Limiting)은 YouTube 응답 패턴을 실시간으로 분석해 자동으로 조절됩니다.
                    차단 신호가 감지되면 자동으로 속도를 줄이고, 안전하면 최대 효율로 운영합니다.
                    수동 개입 없이도 최적의 상태를 유지합니다.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 전략적 수집 제어 */}
                <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                전략적 수집 제어
                            </CardTitle>
                            <CardDescription className="text-xs">
                                특정 수집 기능을 활성화 또는 비활성화하여 YouTube 요청량을 조절합니다.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between space-x-3 p-3.5 bg-muted/30 border border-border rounded-2xl">
                            <div className="space-y-0.5">
                                <Label htmlFor="view-stats" className="font-bold text-xs sm:text-sm text-foreground cursor-pointer">조회수 추적 활성화</Label>
                                <p className="text-xs text-muted-foreground">
                                    이미 다운로드된 영상의 조회수 변화를 주기적으로 수집합니다. 끄면 YouTube 요청 수가 크게 줄어듭니다.
                                </p>
                            </div>
                            <Switch
                                id="view-stats"
                                checked={settings?.rate_limiting?.enable_view_stats_collection}
                                onCheckedChange={(checked) => {
                                    if (settings?.rate_limiting) {
                                        updateViewStatsMutation.mutate({
                                            ...settings.rate_limiting,
                                            enable_view_stats_collection: checked
                                        });
                                    }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 시스템 자동 정리 */}
                <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                                <Database className="h-4 w-4 text-purple-500" />
                                시스템 자동 정리
                            </CardTitle>
                            <CardDescription className="text-xs">
                                오래된 프로세스 로그 및 임시 파일을 주기적으로 정리합니다.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between space-x-3 p-3.5 bg-muted/30 border border-border rounded-2xl">
                            <div className="space-y-0.5">
                                <Label htmlFor="auto-cleanup" className="font-bold text-xs sm:text-sm text-foreground cursor-pointer">자동 정리 (Auto Cleanup)</Label>
                                <p className="text-xs text-muted-foreground">오래된 프로세스 로그 및 임시 파일을 자동 삭제합니다.</p>
                            </div>
                            <Switch
                                id="auto-cleanup"
                                checked={settings?.maintenance?.auto_cleanup}
                                onCheckedChange={(checked) => handleMaintenanceChange('auto_cleanup', checked)}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs font-bold text-muted-foreground">정리 주기 (Cleanup Interval)</Label>
                                <span className="text-xs font-mono font-bold text-purple-400">{settings?.maintenance?.cleanup_interval_days ?? 30}일</span>
                            </div>
                            <Slider
                                value={[settings?.maintenance?.cleanup_interval_days ?? 30]}
                                max={90}
                                min={7}
                                step={1}
                                onValueChange={(value) => handleMaintenanceChange('cleanup_interval_days', value[0])}
                            />
                            <p className="text-[10px] text-muted-foreground">{settings?.maintenance?.cleanup_interval_days ?? 30}일보다 오래된 임시 파일이 자동으로 제거됩니다.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 데이터베이스 백업 관리 */}
            <Card className="border-border bg-card shadow-2xs rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border py-3.5">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                                <HardDrive className="h-4 w-4 text-emerald-500" />
                                데이터베이스 백업 관리
                            </CardTitle>
                            <CardDescription className="text-xs">
                                백업 위치: <span className="font-mono text-foreground/70">{backupList?.backup_dir || '...'}</span>
                            </CardDescription>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={handleOpenBackupFolder} className="h-8 px-3 text-xs rounded-xl border-border">
                                <Folder className="h-3.5 w-3.5 mr-1.5" />
                                폴더 열기
                            </Button>
                            <Button size="sm" onClick={handleBackupNow} disabled={isBackingUp} className="h-8 px-3 text-xs rounded-xl font-bold">
                                {isBackingUp ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                {isBackingUp ? '백업 중...' : '지금 백업'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {/* 자동 일일 백업 토글 */}
                    <div className="flex items-center justify-between space-x-3 p-3.5 bg-muted/30 border border-border rounded-2xl mb-4">
                        <div className="space-y-0.5">
                            <Label htmlFor="daily-backup" className="font-bold text-xs sm:text-sm text-foreground cursor-pointer">자동 일일 백업</Label>
                            <p className="text-xs text-muted-foreground">매일 새벽 3시에 데이터베이스를 자동으로 백업합니다. 최근 7개 파일만 유지됩니다.</p>
                        </div>
                        <Switch
                            id="daily-backup"
                            checked={settings?.maintenance?.backup_enabled}
                            onCheckedChange={(checked) => handleMaintenanceChange('backup_enabled', checked)}
                        />
                    </div>

                    {/* 백업 파일 목록 */}
                    {backupList && backupList.total_count > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    저장된 백업 ({backupList.total_count}개)
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                    총 {backupList.total_size_kb.toLocaleString()} KB
                                </span>
                            </div>
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {backupList.backups.map((backup) => (
                                    <div
                                        key={backup.filename}
                                        className="flex items-center justify-between gap-2 p-2.5 bg-muted/20 border border-border rounded-xl hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-2 min-w-0">
                                            <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="text-xs font-mono text-foreground break-all leading-snug">{backup.filename}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{backup.created_at} · {backup.size_kb.toLocaleString()} KB</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 flex-shrink-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
                                            disabled={deletingFile === backup.filename}
                                            onClick={() => handleDeleteBackup(backup.filename)}
                                        >
                                            {deletingFile === backup.filename
                                                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />
                                            }
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                            <Database className="h-8 w-8 opacity-30" />
                            <p className="text-xs">저장된 백업 파일이 없습니다.</p>
                            <p className="text-[10px] opacity-70">지금 백업을 실행하거나 자동 백업을 활성화하세요.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 위험 구역 */}
            <div className="border border-rose-200 dark:border-rose-900/50 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-rose-50/90 dark:bg-rose-950/30 border-b border-rose-200 dark:border-rose-900/50 px-4 py-3.5">
                    <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        위험 구역 (Danger Zone)
                    </h3>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300/70 mt-0.5">이 작업들은 되돌리기 어렵습니다. 신중하게 진행하세요.</p>
                </div>
                <div className="p-4 bg-rose-50/40 dark:bg-rose-950/15">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-card border border-rose-200/80 dark:border-rose-900/40 rounded-2xl shadow-2xs">
                        <div>
                            <p className="font-bold text-sm text-foreground">데이터베이스 전체 초기화</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                모든 채널, 영상, 설정 데이터가 삭제됩니다.
                                <span className="text-amber-700 dark:text-amber-300 font-bold ml-1">초기화 전 자동 백업이 생성됩니다.</span>
                            </p>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-9 px-4 font-bold rounded-xl flex-shrink-0 shadow-sm"
                            onClick={() => setIsResetDialogOpen(true)}
                        >
                            <RotateCcw className="h-4 w-4 mr-1.5" />
                            데이터베이스 초기화
                        </Button>
                    </div>
                </div>
            </div>

            {/* 초기화 확인 다이얼로그 */}
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">
                            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            데이터베이스 초기화 확인
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed pt-1 text-muted-foreground">
                            이 작업은 <strong className="text-foreground font-bold">모든 채널, 영상, 설정, 스케줄 데이터를 삭제</strong>합니다.
                            <br /><br />
                            진행하기 전에 <span className="text-amber-700 dark:text-amber-300 font-bold">자동으로 백업 파일이 생성</span>되며,
                            백업 폴더에서 복원할 수 있습니다. 그래도 계속하시겠습니까?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsResetDialogOpen(false)}
                            disabled={isResetting}
                            className="rounded-xl"
                        >
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleResetConfirmed}
                            disabled={isResetting}
                            className="rounded-xl font-bold"
                        >
                            {isResetting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                            {isResetting ? '초기화 중...' : '백업 후 초기화 진행'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
