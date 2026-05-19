import React from 'react';
import { Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Import the warmup components from CaptainQuarters
import CaptainQuarters from '@/components/resource/CaptainQuarters';

const API_BASE = "/api";

const Incubator = () => {
    // Fetch warmup summary stats
    const { data: stats } = useQuery({
        queryKey: ['warmup-stats'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/youtube/warmup/bulk/status`);
            return res.data;
        },
        refetchInterval: 5000 // Refresh every 5 seconds
    });

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Active Warmup Status */}
            <div className="mb-4">
                {/* Quick Stats Banner */}
                {stats && (
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="text-2xl font-black text-slate-900">{stats.running || 0}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">🔥 Running</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="text-2xl font-black text-emerald-600">{stats.completed || 0}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">✅ Completed</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="text-2xl font-black text-indigo-600">{stats.pending || 0}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">⏳ Pending</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                            <div className="text-2xl font-black text-purple-600">{stats.in_progress || 0}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">📈 Day 1-6</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content - CaptainQuarters Component */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <CaptainQuarters />
            </div>

            {/* Step Indicators Only */}
            <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                        <div key={day} className="text-center">
                            <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day {day}</div>
                                <div className="text-[10px] font-bold text-slate-700 mt-1">
                                    {day === 1 && 'EXPLORE'}
                                    {day === 2 && 'INTEREST'}
                                    {day === 3 && 'COMMUNITY'}
                                    {day === 4 && 'DEEPEN'}
                                    {day === 5 && 'STABILIZE'}
                                    {day === 6 && 'DIVERSIFY'}
                                    {day === 7 && 'MATURE'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Incubator;
