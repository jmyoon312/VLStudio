import React from 'react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import { DollarSign, Cpu, Zap, Activity } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

interface TelemetryData {
    session_id: string;
    total_cost_usd: number;
    total_tokens: number;
    agent_breakdown: Record<string, {
        cost: number;
        tokens: number;
    }>;
}

interface SovereignGovernanceMonitorProps {
    data: TelemetryData | null;
    isLoading: boolean;
}

const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export const SovereignGovernanceMonitor: React.FC<SovereignGovernanceMonitorProps> = ({ 
    data, 
    isLoading 
}) => {
    if (isLoading || !data) {
        return (
            <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-slate-100 rounded-3xl">
                <div className="text-center space-y-2">
                    <Activity className="w-8 h-8 text-slate-200 animate-pulse mx-auto" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">텔레메트리 데이터 동기화 중...</p>
                </div>
            </div>
        );
    }

    const chartData = Object.entries(data.agent_breakdown).map(([name, stats]) => ({
        name: name.replace('NODE', '').replace('_', ' '),
        cost: stats.cost,
        tokens: stats.tokens
    }));

    return (
        <div className="space-y-6">
            {/* KPI Overlay */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl">
                            <DollarSign className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">총 추산 비용</p>
                            <h3 className="text-xl font-black text-white italic">${data.total_cost_usd.toFixed(4)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-0 shadow-xl rounded-2xl overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">총 사용 토큰량</p>
                            <h3 className="text-xl font-black text-white italic">{data.total_tokens.toLocaleString()}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Cost Breakdown Chart */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">에이전트별 비용 소모 (Agent Cost Distribution)</h5>
                </div>
                
                <div className="h-[250px] w-full bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} 
                            />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '16px', border: '0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                <Activity className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-900 font-bold leading-relaxed italic">
                    실시간 비용은 Gemini 1.5 Pro/Flash 및 GPT-4o 표준 단가를 기준으로 추산된 값이며, 실제 청구 금액과 다를 수 있습니다.
                </p>
            </div>
        </div>
    );
};
