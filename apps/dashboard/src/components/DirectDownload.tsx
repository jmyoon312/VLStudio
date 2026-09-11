import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import api, { Category, apiLong } from '../lib/api';
import { Card, CardContent } from "@/components/ui/card";
import {
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    Plus,
    Play,
    Trash2,
    FileVideo,
    Music,
    FileText,
    FileUp,
    Sparkles,
    Clock,
    Zap
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface QueueItem {
    id: string;
    url: string;
    categoryId: number | null;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    filePath?: string;
    mp3Path?: string;
    srtPath?: string;
    useBypass?: boolean;
    scriptOnly?: boolean;
    profileId?: string | null;
    downloadMp4?: boolean;
    downloadMp3?: boolean;
    downloadSrt?: boolean;
}

// Official Platform Links
const SUPPORTED_PLATFORMS = [
    // Global
    { name: 'YouTube', url: 'https://www.youtube.com', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
    { name: 'TikTok', url: 'https://www.tiktok.com', color: 'bg-black text-white border-slate-700 dark:bg-zinc-800 dark:text-white dark:border-zinc-700' },
    { name: 'Instagram', url: 'https://www.instagram.com', color: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800' },

    // Chinese Platforms (Direct Links)
    { name: 'Douyin', url: 'https://www.douyin.com', color: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' },
    { name: 'Kuaishou', url: 'https://www.kuaishou.com', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
    { name: 'Xiaohongshu', url: 'https://www.xiaohongshu.com', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
    { name: 'Bilibili', url: 'https://www.bilibili.com', color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
    { name: 'Weibo', url: 'https://weibo.com', color: 'bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800' },
    { name: 'Haokan', url: 'https://haokan.baidu.com', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },

    // Others
    { name: 'Xigua Video', url: 'https://www.ixigua.com', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
    { name: 'Pipixia', url: 'https://pipix.com', color: 'bg-pink-50 text-pink-600 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800' },
    { name: 'AcFun', url: 'https://www.acfun.cn', color: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
    { name: 'Toutiao', url: 'https://www.toutiao.com', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
    { name: 'Huya', url: 'https://www.huya.com', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
    { name: 'Weishi', url: 'https://weishi.qq.com', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
];

const DirectDownload = () => {
    const location = useLocation();

    // Mode Tab: 'url' | 'local'
    const [activeTab, setActiveTab] = useState<'url' | 'local'>('url');

    // URL Download States
    const [urlInput, setUrlInput] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
    const [autoStart, setAutoStart] = useState(false);

    // Format selection checkboxes (URL Download)
    const [downloadMp4, setDownloadMp4] = useState(true);
    const [downloadMp3, setDownloadMp3] = useState(true);
    const [downloadSrt, setDownloadSrt] = useState(true);

    // Manual Bypass Toggle
    const [useBypass, setUseBypass] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false); // Debug toggle
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

    // Single Download State
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [result, setResult] = useState<any>(null);

    // Local MP4 File Extraction States
    const [localFilePath, setLocalFilePath] = useState('');
    const [localFileName, setLocalFileName] = useState('');
    const [localFileSize, setLocalFileSize] = useState<number | null>(null);
    const [localExtractMp3, setLocalExtractMp3] = useState(true);
    const [localExtractSrt, setLocalExtractSrt] = useState(true);
    const [localStatus, setLocalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [localWhisperModel, setLocalWhisperModel] = useState<'tiny' | 'base' | 'small'>('base');
    const [localProgress, setLocalProgress] = useState(0);
    const [localStage, setLocalStage] = useState<'init' | 'mp3' | 'srt' | 'done' | 'error'>('init');
    const [localStageName, setLocalStageName] = useState('추출 작업 초기화 중...');
    const [localDetail, setLocalDetail] = useState('');
    const [localErrorMsg, setLocalErrorMsg] = useState('');
    const [localResult, setLocalResult] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const localFileInputRef = useRef<HTMLInputElement | null>(null);
    const pollTimerRef = useRef<any>(null);

    useEffect(() => {
        return () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
            }
        };
    }, []);

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
                downloadMp4: downloadMp4,
                downloadMp3: downloadMp3,
                downloadSrt: downloadSrt,
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
    }, [location.state, selectedCategoryId, useBypass, downloadMp4, downloadMp3, downloadSrt]);

    const { data: categories } = useQuery<Category[]>({
        queryKey: ['categories'],
        queryFn: async () => (await api.get('/categories/')).data
    });

    // Fetch Browser Profiles
    const { data: browserProfiles } = useQuery<any[]>({
        queryKey: ['browserProfiles'],
        queryFn: async () => (await api.get('/browser-profiles')).data
    });

    const downloadMutation = useMutation({
        mutationFn: (data: {
            url: string,
            category_id: number | null,
            use_bypass: boolean,
            headless: boolean,
            profile_id?: string | null,
            download_mp4?: boolean,
            download_mp3?: boolean,
            download_srt?: boolean
        }) =>
            apiLong.post('/videos/download', {
                url: data.url,
                category_id: data.category_id,
                use_bypass: data.use_bypass,
                headless: data.headless,
                script_only: !data.download_mp4 && !data.download_mp3,
                profile_id: data.profile_id,
                download_mp4: data.download_mp4 ?? true,
                download_mp3: data.download_mp3 ?? true,
                download_srt: data.download_srt ?? true
            }),
    });

    const extractLocalMutation = useMutation({
        mutationFn: (data: { file_path: string, extract_mp3: boolean, extract_srt: boolean, whisper_model?: string }) =>
            apiLong.post('/videos/extract-local', data),
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
            useBypass: useBypass,
            downloadMp4: downloadMp4,
            downloadMp3: downloadMp3,
            downloadSrt: downloadSrt,
            profileId: selectedProfileId
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
                downloadMp4: downloadMp4,
                downloadMp3: downloadMp3,
                downloadSrt: downloadSrt,
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
                headless: !showBrowser,
                profile_id: selectedProfileId,
                download_mp4: downloadMp4,
                download_mp3: downloadMp3,
                download_srt: downloadSrt
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
            setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

            try {
                const res = await downloadMutation.mutateAsync({
                    url: item.url,
                    category_id: item.categoryId,
                    use_bypass: item.useBypass ?? false,
                    headless: true,
                    profile_id: item.profileId,
                    download_mp4: item.downloadMp4 ?? true,
                    download_mp3: item.downloadMp3 ?? true,
                    download_srt: item.downloadSrt ?? true
                });

                setQueue(prev => prev.map(i => i.id === item.id ? {
                    ...i,
                    status: 'success',
                    message: res.data.status === 'exists' ? '이미 존재함' : '완료',
                    filePath: res.data.file_path,
                    mp3Path: res.data.mp3_path,
                    srtPath: res.data.srt_path
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

    // Native & Web File Selection for Local Extraction
    const handleSelectLocalFile = async () => {
        try {
            if ((window as any).electronAPI?.selectVideoFile) {
                const res = await (window as any).electronAPI.selectVideoFile();
                if (res?.success && res.path) {
                    setLocalFilePath(res.path);
                    const name = res.path.split(/[\\/]/).pop() || res.path;
                    setLocalFileName(name);
                    setLocalFileSize(null);
                    setLocalStatus('idle');
                    setLocalResult(null);
                    setLocalErrorMsg('');
                }
            } else {
                localFileInputRef.current?.click();
            }
        } catch (e) {
            console.error('File selection error:', e);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const nativePath = (file as any).path || file.name;
        setLocalFilePath(nativePath);
        setLocalFileName(file.name);
        setLocalFileSize(file.size);
        setLocalStatus('idle');
        setLocalResult(null);
        setLocalErrorMsg('');
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        const nativePath = (file as any).path || file.name;
        setLocalFilePath(nativePath);
        setLocalFileName(file.name);
        setLocalFileSize(file.size);
        setLocalStatus('idle');
        setLocalResult(null);
        setLocalErrorMsg('');
    };

    const handleLocalExtract = async () => {
        if (!localFilePath) return;
        if (!localExtractMp3 && !localExtractSrt) {
            alert('MP3 또는 SRT 추출 중 최소 1개 이상을 선택해주세요.');
            return;
        }

        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }

        setLocalStatus('loading');
        setLocalProgress(0);
        setLocalStage('init');
        setLocalStageName('추출 작업 초기화 중...');
        setLocalDetail('영상 스트림 분석 및 엔진 로드 중');
        setLocalResult(null);
        setLocalErrorMsg('');

        try {
            const res = await extractLocalMutation.mutateAsync({
                file_path: localFilePath,
                extract_mp3: localExtractMp3,
                extract_srt: localExtractSrt,
                whisper_model: localWhisperModel
            });

            const taskId = res.data?.task_id;
            if (!taskId) {
                setLocalProgress(100);
                setLocalStatus('success');
                setLocalResult(res.data);
                return;
            }

            // Start polling progress every 500ms
            pollTimerRef.current = setInterval(async () => {
                try {
                    const statusRes = await api.get(`/videos/extract-task/${taskId}`);
                    const taskData = statusRes.data;
                    if (!taskData) return;

                    if (typeof taskData.progress === 'number') {
                        setLocalProgress(taskData.progress);
                    }
                    if (taskData.stage) setLocalStage(taskData.stage);
                    if (taskData.stage_name) setLocalStageName(taskData.stage_name);
                    if (taskData.detail) setLocalDetail(taskData.detail);

                    if (taskData.status === 'completed') {
                        if (pollTimerRef.current) {
                            clearInterval(pollTimerRef.current);
                            pollTimerRef.current = null;
                        }
                        setLocalProgress(100);
                        setLocalStatus('success');
                        setLocalResult({
                            file_path: taskData.file_path,
                            mp3_path: taskData.mp3_path,
                            srt_path: taskData.srt_path
                        });
                    } else if (taskData.status === 'failed') {
                        if (pollTimerRef.current) {
                            clearInterval(pollTimerRef.current);
                            pollTimerRef.current = null;
                        }
                        setLocalStatus('error');
                        setLocalErrorMsg(taskData.error || '추출 중 오류가 발생했습니다.');
                    }
                } catch (pollErr: any) {
                    console.warn('[ExtractTask] Polling error:', pollErr);
                }
            }, 500);

        } catch (error: any) {
            setLocalStatus('error');
            const detail = error.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail :
                Array.isArray(detail) ? detail.map((e: any) => e.msg).join(', ') :
                    '추출 중 오류가 발생했습니다.';
            setLocalErrorMsg(msg);
        }
    };


    const openFolder = async (path: string) => {
        if (!path) return;
        try {
            // 1. Electron Native OS File Explorer Reveal (최우선)
            if ((window as any).electronAPI?.showInFolder) {
                const res = await (window as any).electronAPI.showInFolder(path);
                if (res?.success) return;
            }
            // 2. Backend Fallback
            await api.post('/system/open-folder', { path });
        } catch (e) {
            console.error('Failed to open folder:', e);
            alert("폴더를 열 수 없습니다.");
        }
    };

    const getCategoryName = (id: number | null) => {
        if (!id) return '임시저장';
        return categories?.find(c => c.id === id)?.name || 'Unknown';
    };

    return (
        <div className="space-y-4 sm:space-y-6 w-full max-w-4xl mx-auto p-3 sm:p-6 py-4 sm:py-8 pb-36 md:pb-12 min-h-screen bg-background text-foreground overflow-x-hidden">

            {/* 1. 상단 타이틀 및 설명 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Download className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        URL 영상 직접 수집 & 미디어 추출
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        YouTube, TikTok 등 글로벌 링크 수집 및 2GB+ 대용량 영상 MP4 · MP3 · SRT 개별/일괄 추출 지원
                    </p>
                </div>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-2 sm:pb-3">
                <button
                    type="button"
                    onClick={() => setActiveTab('url')}
                    className={cn(
                        "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                        activeTab === 'url'
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                >
                    <Download className="w-4 h-4" />
                    URL 영상 직접 수집
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('local')}
                    className={cn(
                        "flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all",
                        activeTab === 'local'
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                >
                    <FileUp className="w-4 h-4" />
                    로컬 MP4 파일 추출 (MP3 · SRT)
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 font-semibold px-1.5 py-0.2 rounded ml-0.5">
                        2GB+ 고속
                    </span>
                </button>
            </div>

            {batchSource && activeTab === 'url' && (
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{batchSource}</span>
                    <span className="text-[10px] text-muted-foreground">(우회 모드: {useBypass ? 'ON' : 'OFF'})</span>
                </div>
            )}

            {/* TAB 1: URL 영상 직접 수집 */}
            {activeTab === 'url' && (
                <Card className="shadow-2xs border-border bg-card">
                    <CardContent className="pt-4 sm:pt-6 p-3.5 sm:p-6 space-y-4">
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

                                {/* Format Selection Checkboxes */}
                                <div className="p-3 sm:p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                            수집 및 추출 포맷 선택
                                        </label>
                                        <span className="text-[10px] text-muted-foreground">최소 1개 이상 선택</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                        <label
                                            htmlFor="dl-mp4"
                                            className={cn(
                                                "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all select-none",
                                                downloadMp4
                                                    ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                                            )}
                                        >
                                            <Checkbox
                                                id="dl-mp4"
                                                checked={downloadMp4}
                                                onCheckedChange={(c) => setDownloadMp4(!!c)}
                                                disabled={isBatchProcessing || status === 'loading'}
                                            />
                                            <FileVideo className="w-4 h-4 text-blue-500 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs">MP4 영상</span>
                                                <span className="text-[10px] text-muted-foreground">고화질 원본 비디오</span>
                                            </div>
                                        </label>

                                        <label
                                            htmlFor="dl-mp3"
                                            className={cn(
                                                "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all select-none",
                                                downloadMp3
                                                    ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                                            )}
                                        >
                                            <Checkbox
                                                id="dl-mp3"
                                                checked={downloadMp3}
                                                onCheckedChange={(c) => setDownloadMp3(!!c)}
                                                disabled={isBatchProcessing || status === 'loading'}
                                            />
                                            <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs">MP3 오디오</span>
                                                <span className="text-[10px] text-muted-foreground">2GB+ 고속 디먹싱</span>
                                            </div>
                                        </label>

                                        <label
                                            htmlFor="dl-srt"
                                            className={cn(
                                                "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all select-none",
                                                downloadSrt
                                                    ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                                            )}
                                        >
                                            <Checkbox
                                                id="dl-srt"
                                                checked={downloadSrt}
                                                onCheckedChange={(c) => setDownloadSrt(!!c)}
                                                disabled={isBatchProcessing || status === 'loading'}
                                            />
                                            <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs">SRT 자막</span>
                                                <span className="text-[10px] text-muted-foreground">공식 자막 + Whisper AI</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

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
                                    disabled={isBatchProcessing || status === 'loading' || !urlInput.trim() || (!downloadMp4 && !downloadMp3 && !downloadSrt)}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                                            다운로드 및 추출 중...
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
                                    disabled={isBatchProcessing || status === 'loading' || !urlInput.trim() || (!downloadMp4 && !downloadMp3 && !downloadSrt)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    다운로드 대기열 추가
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* TAB 2: 로컬 MP4 파일 추출 */}
            {activeTab === 'local' && (
                <Card className="shadow-2xs border-border bg-card">
                    <CardContent className="pt-4 sm:pt-6 p-3.5 sm:p-6 space-y-4">
                        {/* File Drop & Picker Zone */}
                        <div
                            onClick={handleSelectLocalFile}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                                isDragging
                                    ? "border-primary bg-primary/10 scale-[1.01]"
                                    : "border-border hover:border-primary/50 hover:bg-muted/30 bg-muted/10",
                                localFilePath && "border-emerald-500/50 bg-emerald-500/5"
                            )}
                        >
                            <input
                                ref={localFileInputRef}
                                type="file"
                                accept="video/mp4,video/*"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                <FileUp className="w-6 h-6" />
                            </div>
                            {localFilePath ? (
                                <div className="space-y-1.5 max-w-md">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs sm:text-sm text-foreground break-all">
                                            {localFileName}
                                        </span>
                                        {localFileSize && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                {(localFileSize / (1024 * 1024 * 1024)).toFixed(2)} GB
                                            </span>
                                        )}
                                        {localFileSize && localFileSize > 1024 * 1024 * 1024 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                                                ⚡ 2GB+ 대용량 모드
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">{localFilePath}</p>
                                    <p className="text-[10px] text-primary font-semibold pt-1">클릭하여 다른 파일 선택</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <p className="text-xs sm:text-sm font-bold text-foreground">
                                        MP4 영상 파일을 클릭하여 선택하거나 여기로 드래그하세요
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        2GB 이상의 초대용량 영상도 메모리 누수 없이 초고속 스트리밍 추출됩니다
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Checkbox Options for Local Extraction */}
                        <div className="p-3 sm:p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                추출할 포맷 선택
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <label
                                    htmlFor="local-mp3"
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all select-none",
                                        localExtractMp3
                                            ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                                    )}
                                >
                                    <Checkbox
                                        id="local-mp3"
                                        checked={localExtractMp3}
                                        onCheckedChange={(c) => setLocalExtractMp3(!!c)}
                                        disabled={localStatus === 'loading'}
                                    />
                                    <Music className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-xs">MP3 오디오 추출</span>
                                        <span className="text-[10px] text-muted-foreground">FFmpeg 초고속 스트리밍 디먹싱</span>
                                    </div>
                                </label>

                                <label
                                    htmlFor="local-srt"
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-lg border text-xs sm:text-sm cursor-pointer transition-all select-none",
                                        localExtractSrt
                                            ? "border-primary/50 bg-primary/5 text-foreground font-medium"
                                            : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30"
                                    )}
                                >
                                    <Checkbox
                                        id="local-srt"
                                        checked={localExtractSrt}
                                        onCheckedChange={(c) => setLocalExtractSrt(!!c)}
                                        disabled={localStatus === 'loading'}
                                    />
                                    <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-xs">SRT 자막 추출</span>
                                        <span className="text-[10px] text-muted-foreground">내장 자막 추출 + Faster-Whisper AI</span>
                                    </div>
                                </label>
                            </div>

                            {/* Whisper Model Speed Selector */}
                            {localExtractSrt && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 px-1 text-xs border-t border-border/50">
                                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                        음성인식 AI 엔진:
                                    </span>
                                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
                                        <button
                                            type="button"
                                            onClick={() => setLocalWhisperModel('tiny')}
                                            disabled={localStatus === 'loading'}
                                            className={cn(
                                                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                                                localWhisperModel === 'tiny'
                                                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            ⚡ Tiny (초고속 2분 컷)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLocalWhisperModel('base')}
                                            disabled={localStatus === 'loading'}
                                            className={cn(
                                                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                                                localWhisperModel === 'base'
                                                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            ⭐ Base (균형 권장)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLocalWhisperModel('small')}
                                            disabled={localStatus === 'loading'}
                                            className={cn(
                                                "px-2.5 py-1 rounded text-[11px] font-semibold transition-all",
                                                localWhisperModel === 'small'
                                                    ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            Small (고정밀)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Real-time Progress Monitor HUD Card */}
                        {localStatus === 'loading' && (
                            <div className="rounded-xl border border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 sm:p-5 space-y-3.5 animate-in fade-in slide-in-from-bottom-2">
                                {/* Header: Stage Name & Live Percentage */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </span>
                                        <span className="font-bold text-xs sm:text-sm text-foreground">
                                            {localStageName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-extrabold text-primary">
                                        <span>{localProgress.toFixed(1)}%</span>
                                    </div>
                                </div>

                                {/* Progress Bar with Gradient & Pulse Shimmer */}
                                <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden border border-border/50">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400 rounded-full transition-all duration-300 ease-out relative"
                                        style={{ width: `${Math.max(2, Math.min(100, localProgress))}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                                    </div>
                                </div>

                                {/* Live Detail & Subtitle Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px] text-muted-foreground">
                                    <div className="flex items-center gap-1.5 font-mono font-medium text-foreground/80">
                                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span>{localDetail || "멀티스레드 스트리밍 처리 중..."}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <Zap className="w-3 h-3 shrink-0" />
                                        <span>CUDA GPU Turbo & 멀티스레드 가속</span>
                                    </div>
                                </div>

                                {/* Step Badges */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all",
                                        !localExtractMp3 ? "opacity-40 border-dashed border-border bg-muted/20" :
                                        localStage === 'mp3' ? "border-primary/60 bg-primary/10 text-primary shadow-xs" :
                                        (localStage === 'srt' || localStage === 'done') ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                        "border-border bg-card/60 text-muted-foreground"
                                    )}>
                                        <Music className="w-3.5 h-3.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[11px]">1단계: MP3 오디오</span>
                                            <span className="text-[9px] opacity-80">
                                                {!localExtractMp3 ? "건너뜀" :
                                                 localStage === 'mp3' ? "디먹싱 중..." :
                                                 (localStage === 'srt' || localStage === 'done') ? "완료됨 ✓" : "대기 중"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all",
                                        !localExtractSrt ? "opacity-40 border-dashed border-border bg-muted/20" :
                                        localStage === 'srt' ? "border-primary/60 bg-primary/10 text-primary shadow-xs" :
                                        localStage === 'done' ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                        "border-border bg-card/60 text-muted-foreground"
                                    )}>
                                        <FileText className="w-3.5 h-3.5 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[11px]">2단계: SRT 자막</span>
                                            <span className="text-[9px] opacity-80">
                                                {!localExtractSrt ? "건너뜀" :
                                                 localStage === 'srt' ? "Whisper AI 분석 중..." :
                                                 localStage === 'done' ? "완료됨 ✓" : "대기 중"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Extract Action Button */}
                        <Button
                            type="button"
                            onClick={handleLocalExtract}
                            className="w-full h-11 sm:h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold shadow-xs transition-transform active:scale-[0.99]"
                            disabled={localStatus === 'loading' || !localFilePath || (!localExtractMp3 && !localExtractSrt)}
                        >
                            {localStatus === 'loading' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                                    추출 진행 중... ({localProgress.toFixed(0)}%)
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 text-primary-foreground" />
                                    MP3 / SRT 초고속 추출 시작
                                </>
                            )}
                        </Button>

                        {/* Local Extract Result Card */}
                        {localStatus === 'success' && localResult && (
                            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 space-y-3">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1.5 flex-1">
                                        <h3 className="font-semibold text-sm sm:text-base text-green-900 dark:text-green-300">
                                            추출 완료!
                                        </h3>
                                        <div className="space-y-1 text-xs text-green-700 dark:text-green-400 pt-1">
                                            {localResult.mp3_path && (
                                                <div className="flex items-center gap-1.5">
                                                    <Music className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                                    <span className="font-bold">MP3:</span>
                                                    <span className="truncate">{localResult.mp3_path}</span>
                                                </div>
                                            )}
                                            {localResult.srt_path && (
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                                                    <span className="font-bold">SRT:</span>
                                                    <span className="truncate">{localResult.srt_path}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pt-2">
                                            <button
                                                onClick={() => openFolder(localResult.mp3_path || localResult.srt_path || localResult.file_path || '')}
                                                className="text-xs sm:text-sm font-medium hover:underline inline-flex items-center text-green-700 dark:text-green-400"
                                            >
                                                폴더 열기 <ExternalLink className="ml-1 h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {localStatus === 'error' && (
                            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-300">추출 실패</h3>
                                        <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">{localErrorMsg}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Single Download Result (URL Tab) */}
            {activeTab === 'url' && status === 'success' && result && (
                <div className={cn(
                    "rounded-lg border p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2 space-y-2",
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
                        <div className="space-y-1.5 flex-1">
                            <h3 className={cn("font-semibold text-sm sm:text-base", result.status === 'exists' ? "text-yellow-900 dark:text-yellow-300" : "text-green-900 dark:text-green-300")}>
                                {result.status === 'exists' ? "이미 파일이 존재합니다 (갤러리에 복구됨)" : "수집 및 추출 완료!"}
                            </h3>
                            <p className={cn("text-xs sm:text-sm", result.status === 'exists' ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400")}>
                                {result.metadata?.title || "요청하신 미디어가 성공적으로 저장되었습니다."}
                            </p>

                            {/* Generated Files Path Details */}
                            <div className="space-y-1 text-xs pt-1 opacity-90">
                                {result.file_path && (
                                    <div className="flex items-center gap-1.5">
                                        <FileVideo className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                                        <span className="font-bold">영상:</span>
                                        <span className="truncate">{result.file_path}</span>
                                    </div>
                                )}
                                {result.mp3_path && (
                                    <div className="flex items-center gap-1.5">
                                        <Music className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                        <span className="font-bold">오디오:</span>
                                        <span className="truncate">{result.mp3_path}</span>
                                    </div>
                                )}
                                {result.srt_path && (
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 shrink-0 text-orange-600" />
                                        <span className="font-bold">자막:</span>
                                        <span className="truncate">{result.srt_path}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => openFolder(result.file_path || result.mp3_path || result.srt_path || '')}
                                    className={cn("text-xs sm:text-sm font-medium hover:underline inline-flex items-center", result.status === 'exists' ? "text-yellow-700 dark:text-yellow-400" : "text-green-700 dark:text-green-400")}
                                >
                                    폴더 열기 <ExternalLink className="ml-1 h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'url' && status === 'error' && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h3 className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-300">다운로드 실패</h3>
                            <p className="text-xs sm:text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Queue Section (URL Tab Only) */}
            {activeTab === 'url' && (
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
                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                            <span className="inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-semibold border-border bg-secondary text-secondary-foreground shrink-0">
                                                {getCategoryName(item.categoryId)}
                                            </span>
                                            {item.useBypass && (
                                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                                                    우회 ON
                                                </span>
                                            )}
                                            {item.downloadMp4 && (
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                                                    MP4
                                                </span>
                                            )}
                                            {item.downloadMp3 && (
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                                    MP3
                                                </span>
                                            )}
                                            {item.downloadSrt && (
                                                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                                                    SRT
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
                                        {item.status === 'success' && (item.filePath || item.mp3Path || item.srtPath) ? (
                                            <Button variant="outline" size="sm" onClick={() => openFolder((item.filePath || item.mp3Path || item.srtPath)!)} className="h-8 text-xs font-bold gap-1 border-border">
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
                                        <th className="h-10 sm:h-12 px-3 sm:px-4 text-center align-middle font-medium text-muted-foreground min-w-[80px] whitespace-nowrap">포맷</th>
                                        <th className="h-10 sm:h-12 px-3 sm:px-4 text-center align-middle font-medium text-muted-foreground min-w-[70px] whitespace-nowrap">우회</th>
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
                                                    <div className="flex items-center justify-center gap-1">
                                                        {item.downloadMp4 && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 rounded">MP4</span>}
                                                        {item.downloadMp3 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">MP3</span>}
                                                        {item.downloadSrt && <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1 rounded">SRT</span>}
                                                    </div>
                                                </td>
                                                <td className="p-3 sm:p-4 align-middle text-center whitespace-nowrap">
                                                    {item.useBypass ? <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">ON</span> : <span className="text-muted-foreground text-xs">-</span>}
                                                </td>
                                                <td className="p-3 sm:p-4 align-middle text-right whitespace-nowrap">
                                                    {item.status === 'success' && (item.filePath || item.mp3Path || item.srtPath) ? (
                                                        <Button variant="ghost" size="sm" onClick={() => openFolder((item.filePath || item.mp3Path || item.srtPath)!)}>
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
            )}
        </div>
    );
};

export default DirectDownload;
