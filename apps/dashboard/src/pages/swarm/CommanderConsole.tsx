import React, { useState, useEffect } from 'react';
import { Terminal, Zap, Code, ShieldCheck, Cpu } from 'lucide-react';
import { fetchWithRetry } from "@/lib/utils";

export default function CommanderConsole() {
    const [skills, setSkills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSkills = async () => {
            try {
                const res = await fetchWithRetry('/api/mcp/skills');
                const data = await res.json();
                if (data.status === 'success' && data.skills) {
                    setSkills(data.skills);
                }
            } catch (error) {
                console.error("Failed to load Root MCP skills", error);
            } finally {
                setLoading(false);
            }
        };
        loadSkills();
    }, []);
    return (
        <div className="flex flex-col h-full bg-background font-sans p-6 overflow-y-auto text-foreground">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                        <Terminal className="w-7 h-7 text-primary" />
                        스마트 커맨더 콘솔
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium mt-1">Root MCP 도구 단독 실행 및 플러그인 에이전트 수동 제어</p>
                </div>
                <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border border-border shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Root MCP 연결됨</span>
                </div>
            </div>

            <div className="flex-1 bg-card rounded-2xl border border-border p-2 flex flex-col">
                <div className="flex-1 bg-slate-950 rounded-xl p-4 font-mono text-sm text-slate-200 overflow-y-auto shadow-inner border border-slate-900">
                    <div className="flex items-center gap-2 text-primary font-bold mb-4">
                        <Zap className="w-4 h-4" /> ViraLoop Master Agent Console Initialized.
                    </div>
                    <div className="opacity-70 mb-4">{`> System check OK. Connected to Root MCP Server.`}</div>
                    
                    <div className="mb-6 space-y-1 pl-2 border-l-2 border-slate-800">
                        <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Available Root MCP Skills ({skills.length})
                        </div>
                        {loading ? (
                            <div className="text-slate-500 animate-pulse">Loading skills from root node...</div>
                        ) : (
                            skills.map((skill, idx) => (
                                <div key={idx} className="flex flex-col mb-2">
                                    <span className="text-indigo-300 font-semibold text-xs flex items-center gap-2">
                                        <Code className="w-3 h-3" /> {skill.name}
                                    </span>
                                    <span className="text-slate-400 text-[10px] pl-5 break-words">
                                        {skill.description}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <span className="text-emerald-400">root@viral</span><span className="text-slate-500">:~$</span>
                        <span className="animate-pulse w-2 h-4 bg-slate-400 inline-block ml-1" />
                    </div>
                </div>
                
                <div className="mt-2 p-2 flex gap-2">
                    <input 
                        type="text" 
                        placeholder="커맨드 입력..." 
                        className="flex-1 bg-muted border border-border rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground disabled:opacity-50"
                        disabled
                    />
                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-black tracking-wide hover:bg-primary-hover transition-colors disabled:opacity-50" disabled>
                        실행
                    </button>
                </div>
            </div>
        </div>
    );
}
