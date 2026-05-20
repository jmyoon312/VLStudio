import React, { useState } from 'react';
import { Target, Search, Filter, Play, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { fetchWithRetry } from "@/lib/utils";

export default function SmartScouter() {
    const { toast } = useToast();
    const [isScouting, setIsScouting] = useState(false);

    const handleBatchScouting = async () => {
        setIsScouting(true);
        try {
            // [NEW] Trigger LangGraph Pipeline (Type A Curation Mock)
            const res = await fetchWithRetry('/api/swarm/missions/langgraph-run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    project_id: `scout_batch_${Date.now()}`,
                    channel_dna: { strategy: "curation", name: "Target_Competitor" }
                })
            });
            
            const data = await res.json();
            
            if (data.status === 'SUSPENDED') {
                toast({ 
                    title: "스카우팅 완료 및 렌더링 대기", 
                    description: "에이전트가 컷 편집을 마치고 인간의 승인(HITL)을 기다리고 있습니다. 대기열을 확인하세요."
                });
            } else {
                toast({ title: "스카우팅 파이프라인 가동", description: "성공적으로 에이전트에 지시를 내렸습니다." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "실행 오류", description: "LangGraph 코어에 접속할 수 없습니다." });
        } finally {
            setIsScouting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background font-sans p-6 overflow-y-auto text-foreground">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                        <Target className="w-7 h-7 text-primary" />
                        스마트 스카우터
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">경쟁 채널 발굴 및 시그니처 DNA 분석</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="채널명 또는 키워드 검색..." 
                            className="pl-9 pr-4 py-2 bg-card border border-border rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64 shadow-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-full text-sm font-bold shadow-sm hover:bg-muted transition-colors">
                        <Filter className="w-4 h-4" /> 필터
                    </button>
                    <button 
                        onClick={handleBatchScouting}
                        disabled={isScouting}
                        className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-black tracking-wide shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {isScouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isScouting ? '가동 중...' : '일괄 스카우팅'}
                    </button>
                </div>
            </div>

            <div className="flex gap-6 h-full">
                {/* Left Panel: Category Tree */}
                <div className="w-72 bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">카테고리 분류</h3>
                    <div className="flex-1 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center">
                        <span className="text-sm text-muted-foreground font-medium">카테고리 트리 로딩 중...</span>
                    </div>
                </div>

                {/* Right Panel: Candidate Grid */}
                <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col">
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">발굴된 채널 후보</h3>
                    <div className="flex-1 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center">
                        <span className="text-sm text-muted-foreground font-medium">AI가 추천하는 채널 리스트가 여기에 표시됩니다.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
