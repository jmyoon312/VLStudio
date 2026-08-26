import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api, { Category } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle2, AlertCircle, Loader2, ExternalLink, Plus, Play, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface QueueItem {
    id: string;
    url: string;
    categoryId: number | null;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    filePath?: string;
    useBypass?: boolean; // Added field
    scriptOnly?: boolean; // [NEW]
    profileId?: string | null; // [NEW]
}

// Official Platform Links
const SUPPORTED_PLATFORMS = [
    // Global
    { name: 'YouTube', url: 'https://www.youtube.com', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300' },
    { name: 'TikTok', url: 'https://www.tiktok.com', color: 'bg-black text-white border-slate-200 dark:bg-white dark:text-black' },
    { name: 'Instagram', url: 'https://www.instagram.com', color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300' },

    // Chinese Platforms (Direct Links)
    { name: 'Douyin', url: 'https://www.douyin.com', color: 'bg-slate-100 text-slate-800 border-slate-200' },
    { name: 'Kuaishou', url: 'https://www.kuaishou.com', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { name: 'Xiaohongshu', url: 'https://www.xiaohongshu.com', color: 'bg-red-50 text-red-600 border-red-200' },
    { name: 'Bilibili', url: 'https://www.bilibili.com', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { name: 'Weibo', url: 'https://weibo.com', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    { name: 'Haokan', url: 'https://haokan.baidu.com', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },

    // Others
    { name: 'Xigua Video', url: 'https://www.ixigua.com', color: 'bg-red-100 text-red-700 border-red-200' },
    { name: 'Pipixia', url: 'https://pipix.com', color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { name: 'AcFun', url: 'https://www.acfun.cn', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { name: 'Toutiao', url: 'https://www.toutiao.com', color: 'bg-red-50 text-red-700 border-red-200' },
    { name: 'Huya', url: 'https://www.huya.com', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { name: 'Weishi', url: 'https://weishi.qq.com', color: 'bg-blue-100 text-blue-800 border-blue-200' },
];

const DirectDownload = () => {
    const location = useLocation();
    const [urlInput, setUrlInput] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
    const [autoStart, setAutoStart] = useState(false);

    // Manual Bypass Toggle
    const [useBypass, setUseBypass] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false); // Debug toggle
    const [scriptOnly, setScriptOnly] = useState(false); // [NEW]
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // [NEW]

    // Single Download State
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState<any>(null);

    // Accept batch items from location state (Cross-Menu Integration)
    const [batchSource, setBatchSource] = useState<string | null>(null);
    useEffect(() => {
        if (location.state?.batchUrls) {
            const urls = location.state.batchUrls as string[];
            // Auto-enable bypass if any cross-platform link is detected
            const needsBypass = urls.some(u => 
                u.includes('douyin') || 
                u.includes('tiktok') || 
                u.includes('xiaohongshu') || 
                u.includes('weibo') || 
                u.includes('bilibili') ||
                u.includes('kuaishou')
            );
            
            const finalBypass = location.state.useBypass !== undefined ? location.state.useBypass : (useBypass || needsBypass);
            
            const newItems: QueueItem[] = urls.map(u => ({
                id: Math.random().toString(36).substring(7),
                url: u,
                categoryId: selectedCategoryId,
                status: 'pending',
                useBypass: finalBypass,
                scriptOnly: scriptOnly,
                profileId: selectedProfileId
            }));

            setQueue(prev => [...prev, ...newItems]);
            setUseBypass(finalBypass);
            setAutoStart(true);

            setBatchSource(`🔗 레이더에서 ${urls.length}개 영상이 대기열로 자동 전송됨`);
            // Clear location state to prevent loop if re-rendered
            window.history.replaceState({}, document.title);
            // Auto-clear banner after 5s
            setTimeout(() => setBatchSource(null), 5000);
        }
    }, [location.state, selectedCategoryId, useBypass, scriptOnly]);

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/categories/')).data
    });

    // [NEW] Fetch Browser Profiles
    const { data: browserProfiles } = useQuery<any[]>({
        queryKey: ['browserProfiles'],
        queryFn: async () => (await api.get('/browser-profiles')).data
    });

    const downloadMutation = useMutation({
        mutationFn: (data: { url: string, category_id: number | null, use_bypass: boolean, headless: boolean, script_only?: boolean, profile_id?: string | null }) =>
            api.post('/videos/download', {
                url: data.url,
                category_id: data.category_id,
                use_bypass: data.use_bypass,
                headless: data.headless,
                script_only: data.script_only,
                profile_id: data.profile_id
            }),
    });

    // Auto-start batch processing when autoStart is true and items are added
    React.useEffect(() => {
        if (autoStart && !isBatchProcessing && queue.some(i => i.status === 'pending')) {
            processBatch();
            setAutoStart(false);
        }
    }, [queue, autoStart, isBatchProcessing]);

    const extractUrls = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s,]+)/g;
        const matches = text.match(urlRegex);
        return matches ? matches.map(u => u.trim()) : [];
    };

    const addToQueue = (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        const urls = extractUrls(urlInput);
        if (urls.length === 0) return;

        const newItems: QueueItem[] = urls.map(u => ({
            id: Math.random().toString(36).substring(7),
            url: u,
            categoryId: selectedCategoryId,
            status: 'pending',
            useBypass: useBypass, // Store toggle state
            scriptOnly: scriptOnly // [NEW]
        }));

        setQueue(prev => [...prev, ...newItems]);
        setUrlInput('');
    };

    const handleSingleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        const urls = extractUrls(urlInput);
        if (urls.length === 0) return;

        // If multiple URLs, add to queue and auto-start
        if (urls.length > 1) {
            const newItems: QueueItem[] = urls.map(u => ({
                id: Math.random().toString(36).substring(7),
                url: u,
                categoryId: selectedCategoryId,
                status: 'pending',
                useBypass: useBypass,
                scriptOnly: scriptOnly,
                profileId: selectedProfileId
            }));
            setQueue(prev => [...prev, ...newItems]);
            setUrlInput('');
            setAutoStart(true);
            return;
        }

        // Single URL execution
        const urlToDownload = urls[0];
        setStatus('loading');
        setResult(null);
        setErrorMsg('');

        try {
            const res = await downloadMutation.mutateAsync({
                url: urlToDownload,
                category_id: selectedCategoryId,
                use_bypass: useBypass,
                headless: !showBrowser, // If showBrowser is true, headless is false
                script_only: scriptOnly,
                profile_id: selectedProfileId
            });
            setStatus('success');
            setResult(res.data);
            setUrlInput('');
        } catch (error: any) {
            setStatus('error');
            const detail = error.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail :
                Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') :
                    '다운로드 중 오류가 발생했습니다.';
            setErrorMsg(msg);
        }
    };

    const removeFromQueue = (id: string) => {
        setQueue(prev => prev.filter(item => item.id !== id));
    };

    const processBatch = async () => {
        if (isBatchProcessing || queue.filter(i => i.status === 'pending').length === 0) return;

        setIsBatchProcessing(true);
        const pendingItems = queue.filter(i => i.status === 'pending');

        for (const item of pendingItems) {
            setCurrentProcessingId(item.id);

            // Update status to processing
            setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

            try {
                const result = await downloadMutation.mutateAsync({
                    url: item.url,
                    category_id: item.categoryId,
                    use_bypass: item.useBypass ?? false,
                    headless: true, // Batch always headless for safety
                    script_only: item.scriptOnly ?? false,
                    profile_id: item.profileId
                });

                setQueue(prev => prev.map(i => i.id === item.id ? {
                    ...i,
                    status: 'success',
                    message: result.data.status === 'exists' ? '이미 존재함' : '완료',
                    filePath: result.data.file_path
                } : i));

                // Random delay between 3 to 10 seconds
                const delay = Math.floor(Math.random() * 7000) + 3000;
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error: any) {
                const detail = error.response?.data?.detail;
                const msg = typeof detail === 'string' ? detail :
                    Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') :
                        '실패';

                setQueue(prev => prev.map(i => i.id === item.id ? {
                    ...i,
                    status: 'error',
                    message: msg
                } : i));
            }
        }

        setIsBatchProcessing(false);
        setCurrentProcessingId(null);
    };

    const openFolder = async (path: string) => {
        if (!path) return;
        try {
            // [FIX] Backend now handles directory resolution if a file path is provided
            await api.post('/system/open-folder', { path });
        } catch (e) {
            alert("폴더를 열 수 없습니다.");
        }
    };

    const getCategoryName = (id: number | null) => {
        if (!id) return '임시저장';
        return categories?.find(c => c.id === id)?.name || 'Unknown';
    };

    return (
        <div className="space-y-4 sm:space-y-6 w-full max-w-4xl mx-auto p-3 sm:p-6 py-4 sm:py-8 pb-36 md:pb-12 min-h-screen bg-background text-foreground overflow-x-hidden">

            {batchSource && (
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{batchSource}</span>
                    <span className="text-[10px] text-muted-foreground">(우회 모드: {useBypass ? 'ON' : 'OFF'})</span>
                </div>
            )}

            <Card className="shadow-2xs border-border bg-card">
                <CardContent className="pt-4 sm:pt-6 p-3.5 sm:p-6">
                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                        {SUPPORTED_PLATFORMS.map((platform) => (
                            <a
                                key={platform.name}
                                href={platform.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "text-xs sm:text-sm font-medium px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border shadow-2xs transition-all hover:opacity-80 shrink-0",
                                    platform.color
                                )}
                            >
                                {platform.name}
                            </a>
                        ))}
                    </div>

                    <form onSubmit={addToQueue} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-medium">카테고리</label>
                            <select
                                value={selectedCategoryId || ''}
                                onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none cursor-pointer"
                                disabled={isBatchProcessing || status === 'loading'}
                            >
                                <option value="">카테고리 없음 (임시저장)</option>
                                {categories?.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                * 카테고리 없음을 선택하면 채널 등록 없이 '임시저장' 폴더에 저장됩니다.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs sm:text-sm font-medium">영상 URL 목록 (줄바꿈으로 구분)</label>
                            <textarea
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="https://youtube.com/shorts/...\nhttps://tiktok.com/..."
                                rows={5}
                                className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                disabled={isBatchProcessing || status === 'loading'}
                            />

                            {/* Bypass Mode Switch */}
                            <div className="flex flex-col gap-2 py-2">
                                <div className="flex items-start gap-2.5">
                                    <Switch
                                        id="bypass-mode"
                                        checked={useBypass}
                                        onCheckedChange={setUseBypass}
                                        disabled={isBatchProcessing || status === 'loading'}
                                        className="shrink-0 mt-0.5"
                                    />
                                    <Label htmlFor="bypass-mode" className="text-xs sm:text-sm font-medium cursor-pointer leading-snug break-keep select-none">
                                        우회 모드 사용 (Bypass Mode) - Douyin/Music 등 다운로드 실패 시 사용
                                    </Label>
                                </div>

                                {useBypass && (
                                    <div className="flex flex-col gap-3 pl-8 sm:pl-10 pt-1 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex items-start gap-2.5">
                                            <Switch
                                                id="show-browser"
                                                checked={showBrowser}
                                                onCheckedChange={setShowBrowser}
                                                disabled={isBatchProcessing || status === 'loading'}
                                                className="shrink-0 mt-0.5"
                                            />
                                            <Label htmlFor="show-browser" className="text-xs sm:text-sm font-medium cursor-pointer text-blue-600 dark:text-blue-400 leading-snug select-none">
                                                브라우저 화면 보기 (디버깅용)
                                            </Label>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2 mt-1 w-full max-w-sm">
                                            <Label htmlFor="profile-select" className="text-xs sm:text-sm font-medium shrink-0">연결할 프로필:</Label>
                                            <select
                                                id="profile-select"
                                                value={selectedProfileId || ''}
                                                onChange={(e) => setSelectedProfileId(e.target.value || null)}
                                                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs sm:text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                disabled={isBatchProcessing || status === 'loading'}
                                            >
                                                <option value="">(선택 안함 - 기본 브라우저 환경)</option>
                                                {browserProfiles?.map((profile: any) => (
                                                    <option key={profile.id} value={profile.id}>
                                                        {profile.name} {profile.platform ? `(${profile.platform})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>


                            {/* Script Only Switch */}
                            <div className="flex items-start gap-2.5 py-1">
                                <Switch
                                    id="script-only-mode"
                                    checked={scriptOnly}
                                    onCheckedChange={setScriptOnly}
                                    disabled={isBatchProcessing || status === 'loading'}
                                    className="shrink-0 mt-0.5"
                                />
                                <Label htmlFor="script-only-mode" className="text-xs sm:text-sm font-medium cursor-pointer text-blue-600 dark:text-blue-400 leading-snug select-none">
                                    스크립트 모드 (영상 다운로드 건너뛰기)
                                </Label>
                            </div>

                            {['xiaohongshu', 'weibo', 'bilibili', 'douyin'].some(p => urlInput.toLowerCase().includes(p)) && (
                                <div className="flex items-start gap-2 p-3 mt-2 text-xs sm:text-sm rounded-lg bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-semibold">쿠키 설정 필요</p>
                                        <p>중국 플랫폼(샤오홍슈, 빌리빌리, 웨이보 등) 다운로드 시 로그인이 필요할 수 있습니다. 설정에서 쿠키를 등록해주세요.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
                            <Button
                                type="button"
                                onClick={handleSingleDownload}
                                className="w-full sm:flex-1 h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-[0.99]"
                                disabled={isBatchProcessing || status === 'loading' || !urlInput.trim()}
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                                        다운로드 중...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4 text-primary-foreground" />
                                        즉시 다운로드
                                    </>
                                )}
                            </Button>
                            <Button
                                type="submit"
                                variant="outline"
                                className="w-full sm:flex-1 h-11 sm:h-12 text-xs sm:text-sm font-bold border-border bg-card text-foreground hover:bg-muted shadow-2xs transition-transform active:scale-[0.99]"
                                disabled={isBatchProcessing || status === 'loading' || !urlInput.trim()}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                다운로드 대기열 추가
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Single Download Result */}
            {
                status === 'success' && result && (
                    <div className={cn(
                        "rounded-lg border p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2",
                        result.status === 'exists'
                            ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-900"
                            : "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900"
                    )}>
                        <div className="flex items-start gap-3 sm:gap-4">
                            {result.status === 'exists' ? (
                                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1 flex-1">
                                <h3 className={cn("font-semibold text-sm sm:text-base", result.status === 'exists' ? "text-yellow-900 dark:text-yellow-300" : "text-green-900 dark:text-green-300")}>
                                    {result.status === 'exists' ? "이미 파일이 존재합니다 (갤러리에 복구됨)" : "다운로드 완료!"}
                                </h3>
                                <p className={cn("text-xs sm:text-sm", result.status === 'exists' ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400")}>
                                    {result.metadata?.title || "영상이 성공적으로 저장되었습니다."}
                                </p>
                                <div className="pt-1.5 sm:pt-2">
                                    <button
                                        onClick={() => openFolder(result.file_path || '')}
                                        className={cn("text-xs sm:text-sm font-medium hover:underline inline-flex items-center", result.status === 'exists' ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400")}
                                    >
                                        폴더 열기 <ExternalLink className="ml-1 h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                status === 'error' && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h3 className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-300">다운로드 실패</h3>
                                <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Queue Section */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-border pt-6 sm:pt-8 gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Download className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Batch Queue</span>
                    </div>
                    <Button
                        onClick={processBatch}
                        disabled={isBatchProcessing || queue.filter(i => i.status === 'pending').length === 0}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 h-10 sm:h-11 text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-[0.99]"
                    >
                        {isBatchProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                                처리 중...
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4 text-primary-foreground fill-current" />
                                일괄 다운로드 시작
                            </>
                        )}
                    </Button>
                </div>

                {/* Mobile Responsive Queue Card List (sm:hidden) */}
                <div className="sm:hidden space-y-3">
                    {queue.length === 0 ? (
                        <div className="p-6 text-center text-xs sm:text-sm text-muted-foreground bg-card rounded-xl border border-border">
                            대기열이 비어있습니다.
                        </div>
                    ) : (
                        queue.map((item) => (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs transition-colors",
                                    item.id === currentProcessingId && "border-primary/50 bg-accent/30"
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-semibold border-border bg-secondary text-secondary-foreground shrink-0">
                                            {getCategoryName(item.categoryId)}
                                        </span>
                                        {item.useBypass && (
                                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                                                우회 ON
                                            </span>
                                        )}
                                        {item.scriptOnly && (
                                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                                                스크립트 ON
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        {item.status === 'pending' && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-border bg-secondary text-secondary-foreground">대기</span>}
                                        {item.status === 'processing' && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-transparent bg-blue-500/10 text-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 처리중</span>}
                                        {item.status === 'success' && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-transparent bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> 완료</span>}
                                        {item.status === 'error' && <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold border-transparent bg-red-500/10 text-red-500"><AlertCircle className="w-3 h-3 mr-1" /> 실패</span>}
                                    </div>
                                </div>

                                <div className="bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground truncate border border-border/50">
                                    <a
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline hover:text-primary transition-colors truncate block"
                                    >
                                        {item.url}
                                    </a>
                                </div>

                                {item.message && (
                                    <p className="text-[11px] text-muted-foreground px-1 truncate">{item.message}</p>
                                )}

                                <div className="flex items-center justify-end pt-1 gap-2">
                                    {item.status === 'success' && item.filePath ? (
                                        <Button variant="outline" size="sm" onClick={() => openFolder(item.filePath!)} className="h-8 text-xs font-bold gap-1 border-border">
                                            <ExternalLink className="w-3.5 h-3.5" /> 폴더 열기
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFromQueue(item.id)}
                                            disabled={item.status === 'processing'}
                                            className="h-8 px-2 text-muted-foreground hover:text-destructive text-xs"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> 삭제
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View (hidden sm:block) */}
                <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                    <div className="relative w-full overflow-x-auto">
                        <table className="w-full min-w-[650px] caption-bottom text-xs sm:text-sm">
                            <thead className="[&_tr]:border-b bg-muted/40">
                                <tr className="border-b transition-colors hover:bg-muted/50">
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[100px] whitespace-nowrap">상태</th>
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[120px] whitespace-nowrap">카테고리</th>
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-left align-middle font-medium text-muted-foreground min-w-[160px] whitespace-nowrap">URL</th>
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-center align-middle font-medium text-muted-foreground min-w-[80px] whitespace-nowrap">우회</th>
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-center align-middle font-medium text-muted-foreground min-w-[90px] whitespace-nowrap">스크립트</th>
                                    <th className="h-10 sm:h-12 px-3 sm:px-4 text-right align-middle font-medium text-muted-foreground min-w-[80px] whitespace-nowrap">작업</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {queue.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                            대기열이 비어있습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    queue.map((item) => (
                                        <tr key={item.id} className={cn(
                                            "border-b transition-colors hover:bg-muted/30",
                                            item.id === currentProcessingId && "bg-accent/50"
                                        )}>
                                            <td className="p-3 sm:p-4 align-middle whitespace-nowrap">
                                                {item.status === 'pending' && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border bg-secondary text-secondary-foreground">대기</span>}
                                                {item.status === 'processing' && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-blue-500/10 text-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 처리중</span>}
                                                {item.status === 'success' && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-emerald-500/10 text-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> {item.message}</span>}
                                                {item.status === 'error' && <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-red-500/10 text-red-500"><AlertCircle className="w-3 h-3 mr-1" /> {item.message}</span>}
                                            </td>
                                            <td className="p-3 sm:p-4 align-middle font-medium whitespace-nowrap">
                                                {getCategoryName(item.categoryId)}
                                            </td>
                                            <td className="p-3 sm:p-4 align-middle truncate max-w-[250px] whitespace-nowrap" title={item.url}>
                                                {item.url}
                                            </td>
                                            <td className="p-3 sm:p-4 align-middle text-center whitespace-nowrap">
                                                {item.useBypass ? <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">ON</span> : <span className="text-muted-foreground text-xs">-</span>}
                                            </td>
                                            <td className="p-3 sm:p-4 align-middle text-center whitespace-nowrap">
                                                {item.scriptOnly ? <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">ON</span> : <span className="text-muted-foreground text-xs">-</span>}
                                            </td>
                                            <td className="p-3 sm:p-4 align-middle text-right whitespace-nowrap">
                                                {item.status === 'success' && item.filePath ? (
                                                    <Button variant="ghost" size="sm" onClick={() => openFolder(item.filePath!)}>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFromQueue(item.id)}
                                                        disabled={item.status === 'processing'}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default DirectDownload;
