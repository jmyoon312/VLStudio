import React, { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Trash2, Play, FileAudio } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { resolveFileUrl } from '@/utils/fileUrl';

interface FileItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'done' | 'error';
    message?: string;
}

export default function SilenceRemover() {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sorting State - Default to Number/Asc
    const [sortKey, setSortKey] = useState<string>('숫자');
    const [sortOrder, setSortOrder] = useState<string>('오름차순');

    // Options State - Default to 'Merge' settings
    const [removeSilence, setRemoveSilence] = useState(false);
    const [normalize, setNormalize] = useState(true);
    const [useNr, setUseNr] = useState(false);
    const [nrAggr, setNrAggr] = useState('0.12');
    
    // Studio Enhancement State
    const [studioCompressor, setStudioCompressor] = useState(false);
    const [studioEq, setStudioEq] = useState(false);
    const [studioGate, setStudioGate] = useState(false);
    const [studioLoudnorm, setStudioLoudnorm] = useState(false);
    const [threshold, setThreshold] = useState(0);
    const [minSilence, setMinSilence] = useState(500);
    const [keepSilence, setKeepSilence] = useState(50);
    const [crossfade, setCrossfade] = useState(40);

    const addLog = (msg: string) => {
        const ts = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${ts}] ${msg}`]);
    };

    const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles: FileItem[] = Array.from(e.target.files).map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                status: 'pending',
            }));
            setFiles(prev => [...prev, ...newFiles]);
            addLog(`${newFiles.length}개 파일이 추가되었습니다.`);
            e.target.value = '';
        }
    };

    const clearFiles = () => {
        setFiles([]);
        addLog('파일 목록이 초기화되었습니다.');
    };

    // Sorting Logic
    const sortedFiles = useMemo(() => {
        if (sortKey === '수동정렬') return files;
        const sorted = [...files].sort((a, b) => {
            let comparison = 0;
            switch (sortKey) {
                case '숫자':
                    const numA = parseInt(a.file.name.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.file.name.replace(/\D/g, '')) || 0;
                    comparison = numA - numB;
                    break;
                case '이름':
                    comparison = a.file.name.localeCompare(b.file.name);
                    break;
                case '만든날짜':
                case '수정날짜':
                    comparison = a.file.lastModified - b.file.lastModified;
                    break;
                default:
                    return 0;
            }
            return sortOrder === '오름차순' ? comparison : -comparison;
        });
        return sorted;
    }, [files, sortKey, sortOrder]);

    // Preset State - Default to 'merge'
    const [activePreset, setActivePreset] = useState<string | null>('merge');

    const markAsPendingOnChange = () => {
        setActivePreset(null);
        setFiles(prev => prev.map(f => (f.status === 'done' || f.status === 'error') ? { ...f, status: 'pending' } : f));
    };

    const applyPreset = (type: 'speed' | 'gaming' | 'news' | 'vlog' | 'interview' | 'merge') => {
        setActivePreset(type);
        setRemoveSilence(true);
        setNormalize(true);
        setUseNr(false);
        switch (type) {
            case 'speed':
                setThreshold(-35);
                setMinSilence(200);
                setKeepSilence(10);
                setCrossfade(10);
                setNrAggr('0.15');
                addLog('프리셋: 스피드 쇼츠 (빠른 컷)');
                break;
            case 'gaming':
                setThreshold(-40);
                setMinSilence(300);
                setKeepSilence(50);
                setCrossfade(30);
                setNrAggr('0.15');
                addLog('프리셋: 게임/텐션 (밸런스)');
                break;
            case 'news':
                setThreshold(-45);
                setMinSilence(500);
                setKeepSilence(150);
                setCrossfade(50);
                setUseNr(true);
                setNrAggr('0.20');
                addLog('프리셋: 뉴스/리뷰 (명확함)');
                break;
            case 'vlog':
                setThreshold(-50);
                setMinSilence(800);
                setKeepSilence(300);
                setCrossfade(100);
                setUseNr(true);
                setNrAggr('0.12');
                addLog('프리셋: 브이로그 (자연스러움)');
                break;
            case 'interview':
                setThreshold(-45);
                setMinSilence(400);
                setKeepSilence(200);
                setCrossfade(50);
                setUseNr(true);
                setNrAggr('0.15');
                addLog('프리셋: 인터뷰 (대화형)');
                break;
            case 'merge':
                setThreshold(0);
                setRemoveSilence(false);
                setUseNr(false);
                addLog('프리셋: 단순 합치기 (무음제거 안함)');
                break;
        }
    };

    // Helper to force download via Blob (Bypasses 404 navigation and forces save)
    const forceDownload = async (url: string, filename: string): Promise<boolean> => {
        try {
            const safeUrl = resolveFileUrl(url);
            const res = await fetch(safeUrl);
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return true;
        } catch (e: any) {
            console.error("Blob download failed:", e);
            // Fallback to direct link if blob fails
            const a = document.createElement('a');
            const fallbackUrl = resolveFileUrl(url);
            a.href = fallbackUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return false;
        }
    };

    // Helper to generate a safe filename preserving extension
    const generateSafeFile = (original: File, index: number): File => {
        const parts = original.name.split('.');
        const ext = parts.length > 1 ? parts.pop() : '';
        const safeName = `file_${Date.now()}_${index}${ext ? '.' + ext : ''}`;
        return new File([original], safeName, { type: original.type });
    };

    const processFile = async (item: FileItem, index: number) => {
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));
        addLog(`처리중: ${item.file.name}...`);

        const formData = new FormData();
        const safeFile = generateSafeFile(item.file, index);
        formData.append('files', safeFile);

        const options = {
            remove_silence: removeSilence,
            normalize: normalize,
            use_nr: useNr,
            studio_mode: false,
            nr_aggr: parseFloat(nrAggr) || 0.15,
            threshold: threshold,
            min_silence_len: minSilence,
            keep_silence_ms: keepSilence,
            crossfade_ms: crossfade,
            studio_compressor: studioCompressor,
            studio_eq: studioEq,
            studio_gate: studioGate,
            studio_loudnorm: studioLoudnorm,
        };
        formData.append('options', JSON.stringify(options));

        try {
            const response = await fetch(`${API_BASE_URL}/tools/silence/process`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errText = await response.text();
                let errMsg = `서버 오류: ${response.status}`;
                try {
                    const jsonErr = JSON.parse(errText);
                    if (jsonErr.detail) errMsg = jsonErr.detail;
                } catch { errMsg = errText || errMsg; }
                throw new Error(errMsg);
            }

            const data = await response.json();
            if (data.status === 'success' && data.web_url) {
                const filename = data.server_path ? data.server_path.split(/[/\\]/).pop() : (data.web_url.split('/').pop() || `processed_${item.file.name}`);
                await forceDownload(data.web_url, filename);

                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'done' } : f));
                addLog(`완료: ${item.file.name}`);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error: any) {
            console.error(error);
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', message: error.message } : f));
            addLog(`오류 (${item.file.name}): ${error.message}`);
            toast.error(`파일 "${item.file.name}" 전송 실패: ${error.message}`);
        }
    };

    const handleStartProcessing = async () => {
        const pending = sortedFiles.filter(f => f.status === 'pending');
        
        if (pending.length === 0) {
            addLog('처리할 대기 중인 파일이 없습니다. 옵션을 변경하여 재처리할 수 있습니다.');
            return;
        }

        // Merge mode - Trigger if threshold is 0 OR if the 'merge' preset is active
        if (threshold === 0 || activePreset === 'merge') {
            addLog(`${pending.length}개 파일 합치기 시작...`);
            setFiles(prev => prev.map(f => pending.find(p => p.id === f.id) ? { ...f, status: 'processing' } : f));
            const formData = new FormData();
            pending.forEach((p, idx) => {
                const safeFile = generateSafeFile(p.file, idx);
                formData.append('files', safeFile);
            });
            const options = {
                threshold: 0,
                remove_silence: removeSilence,
                normalize: normalize,
                use_nr: useNr,
                studio_compressor: studioCompressor,
                studio_eq: studioEq,
                studio_gate: studioGate,
                studio_loudnorm: studioLoudnorm,
            };
            formData.append('options', JSON.stringify(options));
            try {
                const response = await fetch(`${API_BASE_URL}/tools/silence/process`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`서버 오류: ${response.status} ${errText}`);
                }
                const data = await response.json();
                if (data.status === 'success' && data.web_url) {
                    const filename = data.server_path ? data.server_path.split(/[/\\]/).pop() : (data.web_url.split('/').pop() || 'merged.mp3');
                    await forceDownload(data.web_url, filename);

                    setFiles(prev => prev.map(f => pending.find(p => p.id === f.id) ? { ...f, status: 'done' } : f));
                    addLog('합치기 완료!');
                } else {
                    throw new Error('Invalid response');
                }
            } catch (error: any) {
                console.error(error);
                setFiles(prev => prev.map(f => pending.find(p => p.id === f.id) ? { ...f, status: 'error', message: error.message } : f));
                addLog(`합치기 실패: ${error.message}`);
                toast.error(`파일 합치기 실패: ${error.message}`);
            }
            return;
        }

        // Normal processing
        addLog(`${pending.length}개 파일의 일괄 처리를 시작합니다...`);
        for (let i = 0; i < pending.length; i++) {
            await processFile(pending[i], i);
        }
        addLog('일괄 처리가 완료되었습니다.');
    };

    return (
        <div className="p-3 sm:p-6 pb-36 md:pb-8 space-y-3 sm:space-y-6 max-w-6xl mx-auto min-h-screen bg-background text-foreground">
            {/* 1. 상단 타이틀 헤더 바 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-3 border-b border-border">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <Scissors className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
                        <span>무음 구간 자동 컷팅</span>
                    </h1>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                        오디오의 불필요한 호흡 및 무음 구간을 50ms 단위로 초정밀 자동 컷팅하여 오디오 밀도 극대화
                    </p>
                </div>
            </div>

            {/* Zone 1: Top Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-card p-3 sm:p-4 rounded-xl border border-border shadow-2xs gap-2.5">
                <div className="flex flex-wrap gap-2">
                    <input
                        type="file"
                        multiple
                        accept="audio/*,video/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleAddFiles}
                    />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs sm:text-sm">
                        <FolderOpen className="mr-1.5 h-4 w-4" />
                        파일 추가
                    </Button>
                    <Button variant="destructive" size="sm" onClick={clearFiles} className="bg-transparent text-destructive border-destructive border hover:bg-destructive/10 text-xs sm:text-sm">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        목록 초기화
                    </Button>
                </div>
                <Button size="sm" className={cn("text-white text-xs sm:text-sm font-bold h-9 px-4", (threshold === 0 || activePreset === 'merge') ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-600 hover:bg-green-700")} onClick={handleStartProcessing}>
                    <Play className="mr-1.5 h-4 w-4" />
                    {(threshold === 0 || activePreset === 'merge') ? "합치기 시작" : "처리 시작"}
                </Button>
            </div>

            {/* Zone 2: Presets */}
            <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        🎛 프리셋 (장르별 최적화)
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                        variant="secondary"
                        className={cn("h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'speed' && "ring-2 ring-blue-500 bg-blue-50")}
                        onClick={() => applyPreset('speed')}
                    >
                        <span className="font-bold">⚡ 스피드 쇼츠</span>
                        <span className="text-xs text-muted-foreground">빠른 컷, 200ms 무음</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className={cn("h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'gaming' && "ring-2 ring-blue-500 bg-blue-50")}
                        onClick={() => applyPreset('gaming')}
                    >
                        <span className="font-bold">🎮 게임/텐션</span>
                        <span className="text-xs text-muted-foreground">밸런스, 300ms 무음</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className={cn("h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'news' && "ring-2 ring-blue-500 bg-blue-50")}
                        onClick={() => applyPreset('news')}
                    >
                        <span className="font-bold">🎤 뉴스/리뷰</span>
                        <span className="text-xs text-muted-foreground">명확함, 500ms 무음</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className={cn("h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'vlog' && "ring-2 ring-blue-500 bg-blue-50")}
                        onClick={() => applyPreset('vlog')}
                    >
                        <span className="font-bold">☕ 브이로그/감성</span>
                        <span className="text-xs text-muted-foreground">자연스러움, 800ms 무음</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className={cn("h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'interview' && "ring-2 ring-blue-500 bg-blue-50")}
                        onClick={() => applyPreset('interview')}
                    >
                        <span className="font-bold">🎙️ 인터뷰/대화</span>
                        <span className="text-xs text-muted-foreground">대화형, 400ms 무음</span>
                    </Button>
                    <Button
                        className={cn("bg-indigo-600 hover:bg-indigo-700 text-white h-auto py-3 flex flex-col items-start gap-1 transition-all", activePreset === 'merge' && "ring-2 ring-indigo-400 ring-offset-2")}
                        onClick={() => applyPreset('merge')}
                    >
                        <span className="font-bold">🔗 단순 합치기</span>
                        <span className="text-xs text-white/80">무음제거 없음</span>
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zone 3: Options (Compact) */}
                <Card className="border-orange-200 dark:border-orange-900 shadow-md">
                    <CardHeader className="pb-3 bg-orange-50/50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/50">
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            ⚙️ 기본 처리 옵션
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border">
                                <Switch id="remove-silence" checked={removeSilence} onCheckedChange={(val) => { setRemoveSilence(val); markAsPendingOnChange(); }} />
                                <label htmlFor="remove-silence" className="text-sm font-bold">무음 제거</label>
                            </div>
                            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border">
                                <Switch id="use-nr" checked={useNr} onCheckedChange={(val) => { setUseNr(val); markAsPendingOnChange(); }} />
                                <label htmlFor="use-nr" className="text-sm font-bold">노이즈 감소</label>
                            </div>
                            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border">
                                <Switch id="normalize" checked={normalize} onCheckedChange={(val) => { setNormalize(val); markAsPendingOnChange(); }} />
                                <label htmlFor="normalize" className="text-sm font-bold">일반 정규화</label>
                            </div>
                        </div>

                        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium whitespace-nowrap w-24">무음 감지 <span className="text-orange-600">({threshold}dB)</span></label>
                                <Slider value={[threshold]} min={-100} max={0} step={1} onValueChange={vals => { setThreshold(vals[0]); markAsPendingOnChange(); }} className="flex-1" />
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium whitespace-nowrap w-24">최소 무음 <span className="text-orange-600">({minSilence}ms)</span></label>
                                <Slider value={[minSilence]} min={100} max={2000} step={50} onValueChange={vals => { setMinSilence(vals[0]); markAsPendingOnChange(); }} className="flex-1" />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-border">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-medium text-foreground whitespace-nowrap">유지:</label>
                                    <Input type="number" value={keepSilence} onChange={e => { setKeepSilence(parseInt(e.target.value) || 0); markAsPendingOnChange(); }} className="w-16 h-7 text-xs bg-background border-border text-foreground" />
                                    <span className="text-[10px] text-muted-foreground">ms</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-medium text-foreground whitespace-nowrap">크로스페이드:</label>
                                    <Input type="number" value={crossfade} onChange={e => { setCrossfade(parseInt(e.target.value) || 0); markAsPendingOnChange(); }} className="w-16 h-7 text-xs bg-background border-border text-foreground" />
                                    <span className="text-[10px] text-muted-foreground">ms</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <label className="text-xs font-medium text-foreground whitespace-nowrap">NR 강도:</label>
                                    <Input type="number" step="0.01" min="0.05" max="0.4" value={nrAggr} onChange={e => { setNrAggr(e.target.value); markAsPendingOnChange(); }} className="w-16 h-7 text-xs bg-background border-border text-foreground" disabled={!useNr} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Zone 3.5: Studio Enhancements */}
                <Card className="border-purple-300 dark:border-purple-800 shadow-2xs relative overflow-hidden bg-card text-card-foreground">
                    <div className="absolute top-0 right-0 p-2">
                        <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                    </div>
                    <CardHeader className="pb-3 bg-purple-500/10 border-b border-purple-200 dark:border-purple-900/50">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
                            ✨ 스튜디오 음질 개선
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className={cn("flex items-center justify-between p-3 rounded-xl border border-border transition-colors", studioCompressor ? "bg-purple-500/10 border-purple-400 dark:border-purple-700" : "bg-muted/30 hover:bg-muted/50")}>
                            <div className="pr-2">
                                <div className="font-bold text-xs sm:text-sm text-foreground">🎙️ 팟캐스트 보이스 (다이내믹 컴프레서)</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">작은 소리는 키우고 큰 소리는 억제하여 단단하고 힘있는 목소리</div>
                            </div>
                            <Switch checked={studioCompressor} onCheckedChange={(val) => { setStudioCompressor(val); markAsPendingOnChange(); }} className="shrink-0" />
                        </div>
                        <div className={cn("flex items-center justify-between p-3 rounded-xl border border-border transition-colors", studioEq ? "bg-purple-500/10 border-purple-400 dark:border-purple-700" : "bg-muted/30 hover:bg-muted/50")}>
                            <div className="pr-2">
                                <div className="font-bold text-xs sm:text-sm text-foreground">🎚️ 또렷하고 풍성하게 (보컬 EQ 부스트)</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">고음을 살려 선명하게, 저음을 더해 웅장하게 (라디오 질감)</div>
                            </div>
                            <Switch checked={studioEq} onCheckedChange={(val) => { setStudioEq(val); markAsPendingOnChange(); }} className="shrink-0" />
                        </div>
                        <div className={cn("flex items-center justify-between p-3 rounded-xl border border-border transition-colors", studioGate ? "bg-purple-500/10 border-purple-400 dark:border-purple-700" : "bg-muted/30 hover:bg-muted/50")}>
                            <div className="pr-2">
                                <div className="font-bold text-xs sm:text-sm text-foreground">🔇 완벽한 적막 (스마트 노이즈 게이트)</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">말을 하지 않는 구간의 백그라운드 노이즈를 완벽히 차단</div>
                            </div>
                            <Switch checked={studioGate} onCheckedChange={(val) => { setStudioGate(val); markAsPendingOnChange(); }} className="shrink-0" />
                        </div>
                        <div className={cn("flex items-center justify-between p-3 rounded-xl border border-border transition-colors", studioLoudnorm ? "bg-purple-500/10 border-purple-400 dark:border-purple-700" : "bg-muted/30 hover:bg-muted/50")}>
                            <div className="pr-2">
                                <div className="font-bold text-xs sm:text-sm text-foreground">📺 유튜브 표준 음량 (EBU R128 정규화)</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">유튜브/방송 표준인 -14 LUFS에 맞춰 듣기 편한 최적의 볼륨</div>
                            </div>
                            <Switch checked={studioLoudnorm} onCheckedChange={(val) => { setStudioLoudnorm(val); markAsPendingOnChange(); }} className="shrink-0" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Zone 4: File List */}
            <Card className="border-emerald-500/40 dark:border-emerald-700 border-2 bg-card text-card-foreground shadow-2xs rounded-xl">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 font-bold text-foreground">
                        📁 파일 목록
                        <span className="text-xs font-normal text-muted-foreground">({files.length}개)</span>
                    </CardTitle>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Select value={sortKey} onValueChange={setSortKey}>
                            <SelectTrigger className="w-[90px] sm:w-[100px] h-8 text-xs bg-background border-border">
                                <SelectValue placeholder="정렬" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="숫자">숫자순</SelectItem>
                                <SelectItem value="이름">이름순</SelectItem>
                                <SelectItem value="만든날짜">날짜순</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-[90px] sm:w-[100px] h-8 text-xs bg-background border-border">
                                <SelectValue placeholder="순서" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="오름차순">오름차순</SelectItem>
                                <SelectItem value="내림차순">내림차순</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                    {/* 모바일 전용 카드 리스트 (md:hidden) */}
                    <div className="md:hidden divide-y divide-border/60">
                        {sortedFiles.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                                추가된 파일이 없습니다.
                            </div>
                        ) : (
                            sortedFiles.map(file => (
                                <div key={file.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                        <FileAudio className="h-4 w-4 text-primary shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-foreground truncate">{file.file.name}</div>
                                            <div className="text-[11px] text-muted-foreground">{(file.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${file.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : file.status === 'processing' ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse' : file.status === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                                        {file.status === 'error' ? '오류' : file.status === 'done' ? '완료' : file.status === 'processing' ? '처리중' : '대기'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 데스크톱 전용 테이블 (hidden md:block) */}
                    <div className="hidden md:block rounded-lg border border-border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="text-xs font-bold text-foreground">파일명</TableHead>
                                    <TableHead className="text-xs font-bold text-foreground">경로</TableHead>
                                    <TableHead className="w-[100px] text-right text-xs font-bold text-foreground">크기</TableHead>
                                    <TableHead className="w-[120px] text-center text-xs font-bold text-foreground">상태</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedFiles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-xs text-muted-foreground">
                                            추가된 파일이 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedFiles.map(file => (
                                        <TableRow key={file.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium flex items-center gap-2 text-xs text-foreground">
                                                <FileAudio className="h-4 w-4 text-primary shrink-0" />
                                                <span className="truncate max-w-xs">{file.file.name}</span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs truncate max-w-xs">
                                                {file.file.webkitRelativePath || '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                                {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${file.status === 'done' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : file.status === 'processing' ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse' : file.status === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted text-muted-foreground'}`}>
                                                    {file.status === 'error' ? '오류' : file.status === 'done' ? '완료' : file.status === 'processing' ? '처리중...' : '대기'}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Zone 5: Logs */}
            <div className="bg-card border border-border text-foreground rounded-xl p-3 sm:p-4 font-mono text-xs h-40 overflow-hidden flex flex-col shadow-2xs">
                <div className="mb-2 font-bold text-foreground border-b border-border pb-1 text-xs flex items-center justify-between">
                    <span>시스템 로그</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{logs.length}줄</span>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-1">
                        {logs.map((log, i) => (
                            <div key={i} className="text-muted-foreground">{log}</div>
                        ))}
                        {logs.length === 0 && <div className="text-muted-foreground italic">준비됨...</div>}
                    </div>
                </ScrollArea>
            </div>

            {/* Zone 6: Bottom Sticky Action Button for Mobile Convenience */}
            <div className="pt-2">
                <Button
                    size="lg"
                    className={cn("w-full text-white font-bold h-11 shadow-lg transition-all rounded-xl text-sm", (threshold === 0 || activePreset === 'merge') ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={handleStartProcessing}
                >
                    <Play className="mr-2 h-4 w-4" />
                    {(threshold === 0 || activePreset === 'merge') ? "🔗 일괄 합치기 시작" : "⚡ 무음 제거 및 음질 개선 일괄 시작"}
                </Button>
            </div>
        </div>
    );
}
