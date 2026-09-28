import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Globe, 
    Cloud, 
    Upload, 
    Film, 
    Scissors, 
    Play, 
    Loader2, 
    Clock, 
    Sparkles, 
    Check, 
    ExternalLink,
    Search,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface CloudMediaSourceModalProps {
    open: boolean;
    onClose: () => void;
    onAttachClip: (clip: { name: string; path: string; stream_url?: string; size_mb?: number; duration?: number }) => void;
}

export const CloudMediaSourceModal: React.FC<CloudMediaSourceModalProps> = ({
    open,
    onClose,
    onAttachClip
}) => {
    const [activeTab, setActiveTab] = useState<'stream' | 'vault' | 'local'>('stream');

    // Tab 1: On-The-Fly Stream Slicer States
    const [streamUrl, setStreamUrl] = useState('');
    const [startSec, setStartSec] = useState<number>(0);
    const [durationSec, setDurationSec] = useState<number>(30);
    const [autoHighlight, setAutoHighlight] = useState(false);
    const [isProbing, setIsProbing] = useState(false);
    const [isSlicing, setIsSlicing] = useState(false);
    const [probeInfo, setProbeInfo] = useState<any>(null);

    // Tab 2: Telegram Cloud Vault States
    const [vaultFiles, setVaultFiles] = useState<any[]>([]);
    const [loadingVault, setLoadingVault] = useState(false);
    const [selectedVaultFile, setSelectedVaultFile] = useState<any>(null);
    const [vaultStartSec, setVaultStartSec] = useState<number>(0);
    const [vaultDurationSec, setVaultDurationSec] = useState<number>(40);
    const [isSlicingVault, setIsSlicingVault] = useState(false);
    const [vaultSearch, setVaultSearch] = useState('');

    useEffect(() => {
        if (open && activeTab === 'vault') {
            fetchVaultFiles();
        }
    }, [open, activeTab]);

    const fetchVaultFiles = async () => {
        setLoadingVault(true);
        try {
            const res = await axios.get('/api/cloud-vault/files');
            if (res.data?.success) {
                setVaultFiles(res.data.files || []);
            }
        } catch (e) {
            console.warn("Failed to fetch vault files:", e);
        } finally {
            setLoadingVault(false);
        }
    };

    const handleProbeStream = async () => {
        if (!streamUrl.trim() || isProbing) return;
        setIsProbing(true);
        try {
            const res = await axios.post('/api/stream-slicer/probe', { url: streamUrl.trim() });
            if (res.data?.success) {
                setProbeInfo(res.data);
                toast.success(`🔍 [${res.data.title || '영상'}] 스트림 탐색 성공`);
            }
        } catch (err: any) {
            toast.error(`스트림 탐색 실패: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsProbing(false);
        }
    };

    const handleExecuteStreamSlice = async () => {
        if (!streamUrl.trim() || isSlicing) return;
        setIsSlicing(true);
        toast.info("✂️ 원천 스트림에서 씬 실시간 컷팅 중 (다운로드 0MB)...");
        try {
            const res = await axios.post('/api/stream-slicer/slice', {
                source_url: streamUrl.trim(),
                start_seconds: startSec,
                duration_seconds: durationSec
            });
            if (res.data?.success) {
                toast.success(`✅ 씬 발골 완료! (${res.data.size_mb}MB)`);
                onAttachClip({
                    name: res.data.filename,
                    path: res.data.filepath,
                    stream_url: res.data.stream_url,
                    size_mb: res.data.size_mb,
                    duration: res.data.duration
                });
                onClose();
            }
        } catch (err: any) {
            toast.error(`슬라이싱 실패: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsSlicing(false);
        }
    };

    const handleExecuteVaultSlice = async () => {
        if (!selectedVaultFile || isSlicingVault) return;
        setIsSlicingVault(true);
        toast.info(`✂️ 클라우드 볼트 [${selectedVaultFile.file_name}]에서 씬 발골 중...`);
        try {
            const res = await axios.post('/api/cloud-vault/slice', {
                file_id: selectedVaultFile.file_id,
                start_seconds: vaultStartSec,
                duration_seconds: vaultDurationSec
            });
            if (res.data?.success) {
                toast.success(`✅ 볼트 씬 발골 완료! (${res.data.size_mb}MB)`);
                onAttachClip({
                    name: res.data.filename,
                    path: res.data.filepath,
                    stream_url: res.data.stream_url,
                    size_mb: res.data.size_mb,
                    duration: res.data.duration
                });
                onClose();
            }
        } catch (err: any) {
            toast.error(`볼트 슬라이싱 실패: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsSlicingVault(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl bg-card border border-border/80 text-foreground p-0 overflow-hidden shadow-2xl rounded-2xl">
                {/* Modal Header */}
                <div className="p-4 px-5 border-b border-border/60 bg-muted/30 flex items-center justify-between">
                    <div>
                        <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                            <Scissors className="w-4 h-4 text-primary" />
                            미디어 소스 & 클라우드 발골 허브
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                            대용량 비디오 전체를 다운로드하지 않고, 필요한 씬만 스트림 레벨에서 즉시 발골하여 대화창에 첨부합니다.
                        </DialogDescription>
                    </div>
                </div>

                {/* 3 Navigation Tabs */}
                <div className="flex items-center gap-1 px-5 pt-3 border-b border-border/50 bg-background text-xs">
                    <button
                        type="button"
                        onClick={() => setActiveTab('stream')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'stream'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>🌐 SNS / 웹 즉시 발골</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('vault')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === 'vault'
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>☁️ 텔레그램 비디오 볼트</span>
                    </button>
                </div>

                {/* Tab 1: On-The-Fly Stream Slicer */}
                {activeTab === 'stream' && (
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span>원천 영상 URL (더우인, 틱톡, 유튜브, FMHY 스트리밍)</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                    04_Profiles 세션 연동
                                </span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={streamUrl}
                                    onChange={(e) => setStreamUrl(e.target.value)}
                                    placeholder="https://v.douyin.com/... 또는 https://www.youtube.com/watch?v=..."
                                    className="text-xs h-9 bg-muted/40 border-border/80"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleProbeStream}
                                    disabled={!streamUrl.trim() || isProbing}
                                    className="h-9 px-3 text-xs shrink-0 font-semibold"
                                >
                                    {isProbing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '스트림 탐색'}
                                </Button>
                            </div>
                        </div>

                        {/* Probed Meta Card */}
                        {probeInfo && (
                            <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-3">
                                {probeInfo.thumbnail && (
                                    <img
                                        src={probeInfo.thumbnail}
                                        alt="Thumbnail"
                                        className="w-16 h-12 rounded-lg object-cover bg-black shrink-0 border border-border/60"
                                    />
                                )}
                                <div className="flex-1 min-w-0 text-xs space-y-0.5">
                                    <div className="font-bold text-foreground truncate">{probeInfo.title}</div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                        <span>총 길이: {Math.floor(probeInfo.duration || 0)}초</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">1080p 원천 스트림 확인</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Timecode Slice Controls */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-foreground">시작 지점 (초)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={startSec}
                                    onChange={(e) => setStartSec(Math.max(0, Number(e.target.value)))}
                                    className="text-xs h-8 bg-background border-border/80 font-mono"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                    {Math.floor(startSec / 60)}분 {Math.floor(startSec % 60)}초부터
                                </span>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold text-foreground">추출 길이 (초)</Label>
                                <Input
                                    type="number"
                                    min={5}
                                    max={180}
                                    value={durationSec}
                                    onChange={(e) => setDurationSec(Math.max(5, Number(e.target.value)))}
                                    className="text-xs h-8 bg-background border-border/80 font-mono"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                    쇼츠 권장: 30~50초
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExecuteStreamSlice}
                                disabled={!streamUrl.trim() || isSlicing}
                                className="h-8 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 shadow-xs"
                            >
                                {isSlicing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        온더플라이 슬라이싱 중...
                                    </>
                                ) : (
                                    <>
                                        <Scissors className="w-3.5 h-3.5" />
                                        씬 발골 & 대화창 첨부
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Tab 2: Telegram Cloud Vault */}
                {activeTab === 'vault' && (
                    <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="flex items-center justify-between gap-2">
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <Input
                                    value={vaultSearch}
                                    onChange={(e) => setVaultSearch(e.target.value)}
                                    placeholder="볼트에 보관된 영화/영상 검색..."
                                    className="text-xs h-8 pl-8 bg-muted/40 border-border/80"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchVaultFiles}
                                className="h-8 px-2.5 text-xs gap-1 shrink-0"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loadingVault ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {/* Vault Files List */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {vaultFiles.length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                                    <Cloud className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-500" />
                                    <p className="font-semibold text-foreground">볼트에 등록된 영화/영상이 아직 없습니다.</p>
                                    <p className="text-[11px] mt-0.5">
                                        텔레그램 비공개 채널에 영상을 업로드하면 이곳에서 용량 0MB로 즉시 발골할 수 있습니다.
                                    </p>
                                </div>
                            ) : (
                                vaultFiles
                                    .filter(f => !vaultSearch || f.file_name.toLowerCase().includes(vaultSearch.toLowerCase()))
                                    .map((vf) => {
                                        const isSelected = selectedVaultFile?.file_id === vf.file_id;
                                        return (
                                            <div
                                                key={vf.file_id}
                                                onClick={() => setSelectedVaultFile(vf)}
                                                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                                                    isSelected
                                                        ? 'bg-purple-500/10 border-purple-500/60 shadow-xs'
                                                        : 'bg-card border-border/70 hover:border-primary/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 truncate max-w-[340px]">
                                                    <Film className="w-4 h-4 text-purple-500 shrink-0" />
                                                    <span className="font-bold text-foreground truncate">{vf.file_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono shrink-0">
                                                    <span>{vf.file_size_mb}MB</span>
                                                    <span>•</span>
                                                    <span>{vf.created_at?.split(' ')[0]}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>

                        {/* Selected Vault Movie Slice Controls */}
                        {selectedVaultFile && (
                            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
                                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                    <Scissors className="w-3.5 h-3.5" />
                                    <span>[{selectedVaultFile.file_name}] 영화 씬 추출 설정</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-foreground">시작 시간 (초)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={vaultStartSec}
                                            onChange={(e) => setVaultStartSec(Math.max(0, Number(e.target.value)))}
                                            className="text-xs h-8 bg-background border-border/80 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[11px] font-semibold text-foreground">길이 (초)</Label>
                                        <Input
                                            type="number"
                                            min={5}
                                            max={180}
                                            value={vaultDurationSec}
                                            onChange={(e) => setVaultDurationSec(Math.max(5, Number(e.target.value)))}
                                            className="text-xs h-8 bg-background border-border/80 font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleExecuteVaultSlice}
                                disabled={!selectedVaultFile || isSlicingVault}
                                className="h-8 px-4 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-xs"
                            >
                                {isSlicingVault ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        볼트 씬 슬라이싱 중...
                                    </>
                                ) : (
                                    <>
                                        <Scissors className="w-3.5 h-3.5" />
                                        볼트 씬 발골 & 대화창 첨부
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
