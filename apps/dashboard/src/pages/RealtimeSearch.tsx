import React, { useState, useEffect } from 'react';
import { Search, Loader2, Sparkles, Crosshair, History, RefreshCcw, Radar, Play, Video, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiLong } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    "엔터테인먼트", "게임", "음악", "코미디", "영화/애니메이션", "뉴스/이슈", "전체"
];

interface KeywordResult {
    ko: string;
    en: string;
    shorts_hook: string;
    viral_reason: string;
    recency?: string;
    context_urls?: string[];
}

interface TrendHistory {
    id: string;
    date: string;
    category: string;
    keyword: string;
    results: KeywordResult[];
}

const RealtimeSearch = () => {
    const navigate = useNavigate();
    const [keyword, setKeyword] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<KeywordResult[]>([]);

    // History State
    const [history, setHistory] = useState<TrendHistory[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('vlstudio_trend_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('vlstudio_trend_history');
        toast.success("발굴 히스토리가 초기화되었습니다.");
    };

    const saveToHistory = (data: KeywordResult[], searchWord: string, cat: string) => {
        const newEntry: TrendHistory = {
            id: Date.now().toString(),
            date: new Date().toLocaleString(),
            category: cat,
            keyword: searchWord || "실시간 발굴",
            results: data
        };
        const updated = [newEntry, ...history].slice(0, 10); // keep last 10
        setHistory(updated);
        localStorage.setItem('vlstudio_trend_history', JSON.stringify(updated));
    };

    const handleSearch = async (isDiscovery = false) => {
        if (isLoading) return;
        setIsLoading(true);

        const currentKeyword = isDiscovery ? "" : keyword.trim();

        try {
            const response = await apiLong.post('/keywords/generate', {
                keyword: currentKeyword,
                category: selectedCategory,
                force_refresh: isDiscovery
            });

            const data = response.data;
            setResults(data);
            saveToHistory(data, currentKeyword, selectedCategory);

            toast.success("쇼츠 트렌드 아이디어 추출 완료!");
        } catch (error) {
            console.error(error);
            toast.error("데이터 로드 실패 (Jina Reader 설정 또는 백엔드를 확인하세요)");
        } finally {
            setIsLoading(false);
        }
    };

    const startRadarScan = async (target: string) => {
        try {
            // 1. Lock Target
            await api.post('/keywords/radar/lock-target', {
                category: selectedCategory,
                target: target
            });
            // 2. Scan Now
            await api.post('/keywords/radar/scan-now', {
                target_shorts_ratio: 0.8
            });
            toast.success(`[${target}] 바이럴 시그널 탐지가 시작되었습니다!`);
            navigate('/keyword-explorer');
        } catch (error: any) {
            toast.error(`시그널 탐지 시작 실패: ${error.message}`);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-7xl mx-auto px-4 py-6">
            <header className="relative p-6 rounded-3xl bg-card border border-border shadow-sm overflow-hidden flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 blur-[120px] rounded-full -mr-32 -mt-32 shrink-0" />
                <div className="relative z-10">
                    <h1 className="text-2xl font-black flex items-center gap-2">
                        <Sparkles className="text-purple-500 w-6 h-6" /> Zero-Shot 트렌드 발굴
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Jina Reader를 활용하여 현재 가장 뜨거운 실시간 트렌드를 쇼츠용으로 추출합니다.</p>
                </div>
            </header>

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 p-2 bg-card rounded-2xl border border-border shadow-sm">
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-all" />
                            <input
                                type="text"
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch(false)}
                                placeholder="분석할 시드 키워드 (비워두면 자동 발굴)"
                                className="w-full bg-transparent border-none pl-14 pr-4 py-4 text-lg text-foreground font-bold focus:outline-none placeholder:text-muted-foreground"
                            />
                        </div>
                        <button
                            onClick={() => handleSearch(false)}
                            disabled={isLoading}
                            className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 m-1"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "수동 검색"}
                        </button>
                        <button
                            onClick={() => handleSearch(true)}
                            disabled={isLoading}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 m-1 shadow-lg shadow-purple-500/20"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCcw className="w-4 h-4" /> 실시간 자동 발굴</>}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4 p-2 bg-card rounded-2xl border border-border flex items-center px-5">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-transparent text-sm font-black text-foreground focus:outline-none w-full appearance-none cursor-pointer py-3"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-4">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-3xl text-muted-foreground gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <p className="text-sm font-medium">Jina Reader를 통해 전세계 실시간 트렌드를 스크래핑 중입니다...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.map((item, idx) => (
                                <div key={idx} className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors" />

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="text-xs font-bold text-purple-600">🔥 HOT TREND</div>
                                            {item.recency && (
                                                <div className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                                                    <Clock className="w-3 h-3" />
                                                    {item.recency}
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black break-keep">{item.ko}</h3>
                                        <p className="text-xs text-muted-foreground uppercase">{item.en}</p>
                                    </div>

                                    {item.context_urls && item.context_urls.length > 0 && (
                                        <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 text-xs mt-2">
                                            <span className="font-bold block mb-1 text-xs text-blue-500/70">참고 자료:</span>
                                            <ul className="list-disc list-inside space-y-1">
                                                {item.context_urls.map((url, urlIdx) => (
                                                    <li key={urlIdx} className="text-blue-600 hover:text-blue-500 hover:underline">
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate">{url}</a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="bg-muted/50 p-3 rounded-xl border border-border/50 text-sm">
                                        <span className="font-bold block mb-1 text-xs text-muted-foreground">이유:</span>
                                        {item.viral_reason}
                                    </div>

                                    <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 text-sm relative">
                                        <Video className="absolute right-3 top-3 w-4 h-4 text-primary/30" />
                                        <span className="font-bold block mb-1 text-xs text-primary/70">쇼츠 후킹 제안:</span>
                                        <p className="font-medium">"{item.shorts_hook}"</p>
                                    </div>

                                    <div className="flex gap-2 mt-2 relative z-10">
                                        <button
                                            onClick={() => startRadarScan(item.ko)}
                                            className="flex-1 py-2.5 bg-foreground text-background hover:bg-foreground/90 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Radar className="w-3.5 h-3.5" /> 시그널 탐지 (영상 수집)
                                        </button>
                                        <button
                                            onClick={() => navigate(`/script-lab?topic=${encodeURIComponent(item.ko)}&hook=${encodeURIComponent(item.shorts_hook)}`)}
                                            className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl flex items-center justify-center transition-colors"
                                        >
                                            대본 작성
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center border border-dashed rounded-3xl text-muted-foreground gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-sm">자동 발굴 버튼을 눌러 최신 쇼츠 트렌드를 발견하세요.</p>
                        </div>
                    )}
                </div>

                <div className="xl:col-span-1">
                    <div className="bg-card border rounded-3xl p-5 sticky top-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b">
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4 text-muted-foreground" />
                                <h3 className="font-bold">발굴 히스토리</h3>
                            </div>
                            {history.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="히스토리 초기화"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">기록이 없습니다.</p>
                            ) : (
                                history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        onClick={() => setResults(entry.results)}
                                        className="p-3 rounded-xl border bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold">{entry.keyword}</span>
                                            <span className="text-[10px] text-muted-foreground">{entry.category}</span>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{entry.date}</div>
                                        <div className="text-xs mt-2 text-foreground/80 line-clamp-1">
                                            {entry.results[0]?.ko} 외 {entry.results.length - 1}건
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealtimeSearch;