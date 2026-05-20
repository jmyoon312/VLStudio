import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, Globe, Loader2, Copy, Flame, TrendingUp, 
    Zap, Target, Sparkles, BarChart3, ChevronRight, 
    History, Info, MousePointer2, MapPin, BarChart, 
    Layers, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// --- Constants ---
const CATEGORIES = [
    "전체", "게임", "엔터테인먼트", "음악", "교육", "노하우/스타일", "뉴스/정치",
    "여행/이벤트", "스포츠", "인물/블로그", "코미디", "영화/애니메이션", "과학/기술",
    "자동차/교통", "반려동물/동물", "비영리/사회운동"
];

const LANGUAGES = [
    { code: 'ko', name: 'KR', emoji: '🇰🇷' },
    { code: 'en', name: 'US', emoji: '🇺🇸' },
    { code: 'ja', name: 'JP', emoji: '🇯🇵' },
    { code: 'zh', name: 'CN', emoji: '🇨🇳' },
    { code: 'es', name: 'ES', emoji: '🇪🇸' },
    { code: 'hi', name: 'IN', emoji: '🇮🇳' },
    { code: 'ru', name: 'RU', emoji: '🇷🇺' }
];

interface KeywordResult {
    ko: string;
    en: string;
    ja?: string;
    zh?: string;
    es?: string;
    hi?: string;
    ru?: string;
    viral_score: number;
    velocity: 'Explosive' | 'Rising' | 'Steady';
    angle: string;
    basis: string;
    source_geo: string;
    [key: string]: any;
}

const KeywordExplorer = () => {
    // State
    const [keyword, setKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [isShortsOnly, setIsShortsOnly] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<KeywordResult[]>([]);
    const [schedulerEnabled, setSchedulerEnabled] = useState(true);
    const [stats, setStats] = useState({ avgScore: 0, explosiveCount: 0 });

    useEffect(() => {
        api.get("/settings/")
            .then(res => setSchedulerEnabled(res.data.enable_trend_scheduling ?? true))
            .catch(err => console.error("Failed to load settings:", err));
    }, []);

    useEffect(() => {
        if (!keyword.trim()) handleSearch(true);
    }, [selectedCategory]);

    useEffect(() => {
        if (results.length > 0) {
            const scores = results.map(r => r.viral_score || 0);
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
            const explosive = results.filter(r => r.velocity === 'Explosive').length;
            setStats({ avgScore: avg, explosiveCount: explosive });
        }
    }, [results]);

    const handleSearch = async (reset = false) => {
        if (isLoading && !reset) return;
        setIsLoading(true);

        const currentKeyword = keyword.trim() || "";
        const currentCategory = selectedCategory === "전체" ? "All" : selectedCategory;

        try {
            const response = await api.post('/keywords/generate', {
                keyword: currentKeyword,
                category: currentCategory
            });

            const data = response.data;
            setResults(data);
            
            if (reset && currentKeyword) {
                toast.success(`${currentCategory} 지능형 트렌드 및 VPI 분석 완료!`);
            }
        } catch (error) {
            console.error(error);
            toast.error("지능형 데이터 로드 실패 (연결 상태를 확인하세요)");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleScheduler = async () => {
        const newState = !schedulerEnabled;
        setSchedulerEnabled(newState);
        try {
            const settingsRes = await api.get("/settings/");
            await api.put("/settings/", { ...settingsRes.data, enable_trend_scheduling: newState });
            toast.success(`배경 트렌드 수집이 ${newState ? "활성화" : "비활성화"}되었습니다.`);
        } catch (err) {
            setSchedulerEnabled(!newState);
            toast.error("설정 변경 실패");
        }
    };

    const openYouTube = (query: string) => {
        if (!query) return;
        let url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        if (isShortsOnly) url += "&sp=EgQwAwE%253D";
        window.open(url, '_blank');
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/30';
        if (score >= 75) return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-900/30';
        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-yellow-500 dark:bg-yellow-500/10 dark:border-yellow-500/20';
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-7xl mx-auto px-4 py-6">
            
            {/* 1. Premium Header with VPI Summary */}
            <header className="relative p-6 rounded-3xl bg-card border border-border shadow-sm overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/5 blur-[120px] rounded-full -mr-32 -mt-32 shrink-0" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    {/* Global Analytics Hub Only */}
                    <div />

                    <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden lg:flex gap-8 px-8 border-x border-border">
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Global Confidence</p>
                                <p className="text-2xl font-black text-foreground">{stats.avgScore}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Market Outliers</p>
                                <p className="text-2xl font-black text-orange-500">{stats.explosiveCount}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-3 bg-muted px-4 py-2 rounded-2xl border border-border">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-muted-foreground leading-none">AGENT</span>
                                    <span className={`text-[9px] font-black uppercase ${schedulerEnabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                                        {schedulerEnabled ? 'Online' : 'Standby'}
                                    </span>
                                </div>
                                <button
                                    onClick={toggleScheduler}
                                    className={`w-11 h-6 rounded-full p-1 transition-all duration-500 relative ${schedulerEnabled ? "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-muted-foreground/30"}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-500 ${schedulerEnabled ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Advanced Control Panel */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 p-1.5 bg-card rounded-2xl border border-border shadow-sm">
                    <div className="flex flex-col md:flex-row gap-1">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-all" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(true)}
                                placeholder="분석할 시드 키워드를 입력하세요 (예: 피지컬100, 반도체)"
                                className="w-full bg-transparent border-none pl-14 pr-4 py-4 text-lg text-foreground font-bold focus:outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                        <button
                            onClick={() => handleSearch(true)}
                            disabled={isLoading}
                            className="px-8 py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-primary/20 active:scale-95 m-1 min-w-[160px]"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-4 h-4" /> AI 바이럴 분석</>}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4 flex gap-2">
                    <div className="flex-1 p-1 bg-card rounded-2xl border border-border flex items-center px-5">
                        <Globe className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-transparent text-sm font-black text-foreground focus:outline-none w-full appearance-none cursor-pointer py-3"
                        >
                            {CATEGORIES.map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={() => setIsShortsOnly(!isShortsOnly)}
                        className={`px-5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-w-[90px] ${isShortsOnly ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-card border-border text-muted-foreground hover:border-muted-foreground/30'}`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase">Shorts</span>
                    </button>
                </div>
            </section>

            {/* 3. Strategic Results Grid */}
            <main className="relative min-h-[500px]">
                {isLoading && results.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-5 animate-pulse">
                        <div className="relative">
                            <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-2xl font-black text-foreground tracking-[0.3em] uppercase">Metric Harvesting...</p>
                            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">글로벌 바이럴 지표 및 검색량 기반 VPI 산출 중</p>
                        </div>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {results.map((item, idx) => (
                            <div 
                                key={idx}
                                className="group relative bg-card border border-border rounded-[2rem] p-7 pt-9 hover:border-primary/30 transition-all duration-500 shadow-md hover:shadow-lg flex flex-col overflow-hidden"
                            >
                                {/* Geo-Indicator Badge */}
                                <div className="absolute top-0 left-8 px-4 py-1.5 bg-red-600 rounded-b-xl shadow-lg flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-white fill-current" />
                                    <span className="text-[10px] font-black text-white tracking-widest uppercase">{item.source_geo || 'GLOBAL'}</span>
                                </div>

                                {/* Heatmap Accent */}
                                <div className={`absolute top-0 right-0 w-40 h-40 blur-[100px] rounded-full -mr-16 -mt-16 transition-all duration-700 opacity-60 ${
                                    item.viral_score >= 90 ? 'bg-red-500/10' : 
                                    item.viral_score >= 75 ? 'bg-orange-500/10' : 'bg-primary/10'
                                }`} />

                                <div className="relative space-y-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <div className={`px-3.5 py-1.5 rounded-full text-[11px] font-black border tracking-wider flex items-center gap-2 ${getScoreColor(item.viral_score)}`}>
                                            <BarChart className="w-3.5 h-3.5" />
                                            VPI: {item.viral_score}
                                        </div>
                                        {item.velocity === 'Explosive' && (
                                            <div className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-500/20 animate-pulse">
                                                <Zap className="w-3.5 h-3.5 fill-current" />
                                                <span className="text-[10px] font-black tracking-widest">EXPLOSIVE</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-3xl font-black text-foreground hover:text-primary transition-colors cursor-pointer leading-[1.1] flex-1 mr-4" onClick={() => openYouTube(item.ko)}>
                                                {item.ko}
                                            </h3>
                                            <button onClick={() => openYouTube(item.ko)} className="p-2.5 bg-muted rounded-2xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-90 border border-border">
                                                <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary-foreground" />
                                            </button>
                                        </div>
                                        <p className="text-muted-foreground text-sm font-black tracking-tighter uppercase font-mono opacity-60">Meta: {item.en}</p>
                                    </div>

                                    {/* Market Basis Summary */}
                                    <div className="flex items-center gap-3 p-3.5 bg-red-600/5 border border-red-500/10 rounded-2xl">
                                        <Info className="w-4 h-4 text-red-500 shrink-0" />
                                        <p className="text-[11px] font-bold text-foreground leading-snug">
                                            <span className="text-red-500 mr-2 uppercase font-black">Market Evidence:</span>
                                            {item.basis || "Trending across multiple high-engagement channels."}
                                        </p>
                                    </div>

                                    <div className="p-5 bg-muted/30 rounded-3xl border border-border group-hover:bg-muted/60 transition-all flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-3.5 h-3.5 text-primary" />
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Viral Hook Strategy</p>
                                        </div>
                                        <p className="text-foreground text-[13px] font-bold leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                                            "{item.angle || "No specific angle generated for this trend."}"
                                        </p>
                                    </div>

                                    {/* Translation Bridge (Multi-Language Chips) */}
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Translation Bridge (Click to search)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {LANGUAGES.map((lang) => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => openYouTube(item[lang.code] || item.ko)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-xl border border-border hover:border-primary/50 hover:bg-accent hover:text-accent-foreground transition-all text-[11px] font-bold text-muted-foreground hover:text-foreground group/chip"
                                                >
                                                    <span className="grayscale group-hover/chip:grayscale-0 transition-all opacity-60 group-hover/chip:opacity-100">{lang.emoji}</span>
                                                    <span className="tracking-tighter uppercase">{lang.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="p-10 bg-muted/50 rounded-full mb-8 border border-border shadow-sm relative">
                            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
                            <Globe className="w-24 h-24 text-muted-foreground relative" />
                        </div>
                        <h3 className="text-3xl font-black text-foreground uppercase tracking-tighter">Ready to Scout</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mt-4 font-medium leading-relaxed">
                            시드 키워드를 입력하여 글로벌 유튜브 데이터를 기반으로 한 <br/>
                            <span className="text-primary font-black">Viral Potential Index (VPI)</span>분석을 시작하세요.
                        </p>
                    </div>
                )}
            </main>

            {/* 4. Strategic Footer */}
            {results.length > 0 && (
                <footer className="flex flex-col md:flex-row justify-center gap-4 pt-12 border-t border-border">
                    <div className="p-4 min-w-[240px] rounded-2xl bg-muted/50 border border-border flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Analysis Mode</p>
                            <p className="text-sm font-bold text-foreground">Global Multi-Pass Agentic</p>
                        </div>
                    </div>
                    <div className="p-4 min-w-[240px] rounded-2xl bg-muted/50 border border-border flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Source Context</p>
                            <p className="text-sm font-bold text-foreground">Metric-Grounding Synthesis</p>
                        </div>
                    </div>
                    <div className="p-4 min-w-[240px] rounded-2xl bg-muted/50 border border-border flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <MousePointer2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">UI Bridge</p>
                            <p className="text-sm font-bold text-foreground">Interactive Translation Search</p>
                        </div>
                    </div>
                </footer>
            )}
            
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .hover-float:hover {
                    animation: float 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default KeywordExplorer;
