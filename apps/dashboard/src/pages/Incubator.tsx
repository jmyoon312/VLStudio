import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
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
        <div className="p-6 space-y-6 bg-background/50 min-h-screen">
            {/* Active Warmup Status Removed as requested */}

            {/* Main Content - CaptainQuarters Component */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <CaptainQuarters />
            </div>

            {/* Step Indicators Removed as requested */}
        </div>
    );
};

export default Incubator;
