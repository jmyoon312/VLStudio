import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export interface TelemetryMetric {
    platform_code: string;
    status: 'HEALTHY' | 'DEGRADED' | 'BLOCKED';
    last_attempt_at: string | null;
    last_success_at: string | null;
    total_collected: number;
    avg_body_length: number;
    image_success_rate: number;
    last_error_code: string | null;
    last_error_reason: string | null;
    healing_strategy_applied: string | null;
}

interface Props {
    metrics: TelemetryMetric[];
    onRefresh: () => void;
}

export function CollectorTelemetryPanel({ metrics, onRefresh }: Props) {
    const [healing, setHealing] = React.useState<string | null>(null);

    const handleHeal = async (platformCode: string) => {
        setHealing(platformCode);
        try {
            await api.post(`/viral/self-heal/${platformCode}`);
            toast.success(`[${platformCode}] 자가치유 파이프라인 트리거 완료!`);
            onRefresh();
        } catch (err: any) {
            toast.error(`자가치유 실패: ${err.message}`);
        } finally {
            setHealing(null);
        }
    };

    const getStatusIcon = (status: string) => {
        if (status === 'HEALTHY') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (status === 'DEGRADED') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
        return <XCircle className="w-4 h-4 text-destructive" />;
    };

    const getStatusBadge = (status: string) => {
        if (status === 'HEALTHY') return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">HEALTHY</Badge>;
        if (status === 'DEGRADED') return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">DEGRADED</Badge>;
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">BLOCKED</Badge>;
    };

    return (
        <Card className="w-full bg-card border-border/80 shadow-xs dark:shadow-none">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="text-primary">📡</span> 플랫폼별 수집 관제 매트릭스
                        </CardTitle>
                        <CardDescription>29개 커뮤니티 + 언론사 + 글로벌 피드 실시간 상태 및 자가치유 제어</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={onRefresh}>
                        <RefreshCw className="w-4 h-4 mr-2" /> 새로고침
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {metrics.map(m => (
                        <div key={m.platform_code} className={`p-3 rounded-md border flex flex-col gap-2 ${m.status === 'BLOCKED' ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30 border-border'}`}>
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                                    {getStatusIcon(m.status)}
                                    <span className="truncate">{m.platform_code}</span>
                                </div>
                                {getStatusBadge(m.status)}
                            </div>
                            
                            <div className="text-xs text-muted-foreground grid grid-cols-2 gap-y-1 mt-1">
                                <div>수집량: <span className="text-foreground">{m.total_collected}건</span></div>
                                <div>이미지: <span className="text-foreground">{m.image_success_rate.toFixed(0)}%</span></div>
                                <div>평균길이: <span className="text-foreground">{m.avg_body_length}자</span></div>
                            </div>

                            {m.status !== 'HEALTHY' && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                    <div className="text-xs text-destructive mb-2 line-clamp-2" title={m.last_error_reason || '원인 불명'}>
                                        {m.last_error_code}: {m.last_error_reason}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full text-xs h-7 bg-background"
                                        disabled={healing === m.platform_code}
                                        onClick={() => handleHeal(m.platform_code)}
                                    >
                                        {healing === m.platform_code ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />}
                                        자가치유 트리거
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

