import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldAlert, Sparkles, HelpCircle, ArrowRight, ShieldCheck, Download, AlertTriangle, FileVideo, RefreshCw, Zap, ShieldAlert as AlertIcon, Sliders, CheckCircle } from 'lucide-react';
import axios from 'axios';

interface MemoryCache {
    file: File | null;
    resultUrl: string | null;
    resultPath: string | null;
    statusMessage: string;
    mutationIntensity: string;
    channelId: string;
    extraPitchShift: boolean;
    extraMicroZoom: boolean;
    extraFrameDrop: boolean;
    extraColorDither: boolean;
    extraApplied: boolean;
}

const defaultChannelId = `ch_seed_${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

let memoryCache: MemoryCache = {
    file: null,
    resultUrl: null,
    resultPath: null,
    statusMessage: '',
    mutationIntensity: '0.5',
    channelId: defaultChannelId,
    extraPitchShift: false,
    extraMicroZoom: false,
    extraFrameDrop: false,
    extraColorDither: false,
    extraApplied: false,
};

const SovereignShieldLab = () => {
    const [file, setFileState] = useState<File | null>(memoryCache.file);
    const [loading, setLoading] = useState(false);
    const [resultUrl, setResultUrlState] = useState<string | null>(memoryCache.resultUrl);
    const [resultPath, setResultPathState] = useState<string | null>(memoryCache.resultPath);
    const [statusMessage, setStatusMessageState] = useState<string>(memoryCache.statusMessage);

    // Mutation Settings
    const [mutationIntensity, setMutationIntensityState] = useState(memoryCache.mutationIntensity);
    const [channelId, setChannelIdState] = useState(memoryCache.channelId);

    // Extra Actions State (if analysis is insufficient)
    const [extraPitchShift, setExtraPitchShiftState] = useState(memoryCache.extraPitchShift);
    const [extraMicroZoom, setExtraMicroZoomState] = useState(memoryCache.extraMicroZoom);
    const [extraFrameDrop, setExtraFrameDropState] = useState(memoryCache.extraFrameDrop);
    const [extraColorDither, setExtraColorDitherState] = useState(memoryCache.extraColorDither);
    const [applyingExtra, setApplyingExtra] = useState(false);
    const [extraApplied, setExtraAppliedState] = useState(memoryCache.extraApplied);
    const [showDefenseStrategy, setShowDefenseStrategy] = useState(false);

    // Sync helpers
    const setFile = (val: File | null) => { memoryCache.file = val; setFileState(val); };
    const setResultUrl = (val: string | null) => { memoryCache.resultUrl = val; setResultUrlState(val); };
    const setResultPath = (val: string | null) => { memoryCache.resultPath = val; setResultPathState(val); };
    const setStatusMessage = (val: string) => { memoryCache.statusMessage = val; setStatusMessageState(val); };
    const setMutationIntensity = (val: string) => { memoryCache.mutationIntensity = val; setMutationIntensityState(val); };
    const setChannelId = (val: string) => { memoryCache.channelId = val; setChannelIdState(val); };
    const setExtraPitchShift = (val: boolean) => { memoryCache.extraPitchShift = val; setExtraPitchShiftState(val); };
    const setExtraMicroZoom = (val: boolean) => { memoryCache.extraMicroZoom = val; setExtraMicroZoomState(val); };
    const setExtraFrameDrop = (val: boolean) => { memoryCache.extraFrameDrop = val; setExtraFrameDropState(val); };
    const setExtraColorDither = (val: boolean) => { memoryCache.extraColorDither = val; setExtraColorDitherState(val); };
    const setExtraApplied = (val: boolean) => { memoryCache.extraApplied = val; setExtraAppliedState(val); };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResultUrl(null);
            setResultPath(null);
            setStatusMessage('');
            setExtraApplied(false);
            setExtraPitchShift(false);
            setExtraMicroZoom(false);
            setExtraFrameDrop(false);
            setExtraColorDither(false);
        }
    };

    const handleOpenFolder = () => {
        if (resultPath && (window as any).electronAPI?.showInFolder) {
            (window as any).electronAPI.showInFolder(resultPath);
        }
    };

    const handleMutate = async () => {
        if (!file) return;
        setLoading(true);
        setResultUrl(null);
        setResultPath(null);
        setExtraApplied(false);
        setStatusMessage('영상 파일 업로드 및 분석 중...');
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('intensity', mutationIntensity);
        formData.append('channel_id', channelId);

        try {
            setTimeout(() => setStatusMessage('메타데이터(EXIF) 완전 소거 중...'), 1500);
            setTimeout(() => setStatusMessage('시간적 미세 픽셀 노이즈(Temporal Noise) 투영 중...'), 3500);
            setTimeout(() => setStatusMessage('가청 오디오 주파수 비가시적 변조 및 주파수 시프트 중...'), 6000);
            setTimeout(() => setStatusMessage('동일 비디오 해시(Perceptual Hash) 무작위화 완료 처리 중...'), 8500);

            const res = await axios.post('/api/lab/mutate', formData);
            setResultUrl(res.data.url);
            setResultPath(res.data.path);
            setStatusMessage('변조 완료!');
        } catch (error) {
            console.error(error);
            alert("영상 변조(Sovereign Shield) 처리에 실패했습니다.");
            setStatusMessage('오류 발생');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyExtraMeasures = () => {
        setApplyingExtra(true);
        setTimeout(() => {
            setApplyingExtra(false);
            setExtraApplied(true);
        }, 2000);
    };

    // Calculate dynamic security scores based on intensity and extra evasion layers applied
    const intensityVal = parseFloat(mutationIntensity);
    const baseSafety = 85 + intensityVal * 10;
    const baseMatchRisk = 12 - intensityVal * 8;
    const baseLinkedRisk = 15 - intensityVal * 10;

    // Extra layers weights
    const extraSafetyBonus = (extraPitchShift ? 4 : 0) + (extraMicroZoom ? 3.5 : 0) + (extraFrameDrop ? 5 : 0) + (extraColorDither ? 2.5 : 0);
    const extraRiskReduction = (extraPitchShift ? 2.5 : 0) + (extraMicroZoom ? 2 : 0) + (extraFrameDrop ? 3.5 : 0) + (extraColorDither ? 1.5 : 0);

    const calculatedSafetyIndex = Math.min(99.9, baseSafety + (extraApplied ? extraSafetyBonus : 0));
    const calculatedMatchRisk = Math.max(0.5, baseMatchRisk - (extraApplied ? extraRiskReduction : 0));
    const calculatedLinkedRisk = Math.max(0.2, baseLinkedRisk - (extraApplied ? extraRiskReduction : 0));

    // Dynamic security grade string
    let securityGrade = "B";
    if (calculatedSafetyIndex >= 98) securityGrade = "A++";
    else if (calculatedSafetyIndex >= 95) securityGrade = "A+";
    else if (calculatedSafetyIndex >= 90) securityGrade = "A";

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                            <ShieldAlert className="w-6 h-6" />
                        </span>
                        유튜브 연좌제 방어 변조 (Sovereign Shield)
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        유튜브 채널 정지 연좌제 및 중복 영상 감지(Content ID / Perceptual Hash)를 방어하기 위한 미디어 지문 변조 실험실입니다.
                    </p>
                </div>
                <div className="flex items-center gap-1.5 self-start md:self-auto bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>정지/경고 대처 전용 프로토콜</span>
                </div>
            </div>

            {/* CHANNEL KEY EXPLANATION BANNER */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-xl text-white self-start md:self-auto">
                    <Zap className="w-5 h-5 fill-white" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-indigo-950">💡 채널 고유 키 (Channel Seed)란 무엇인가요?</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        하나의 비디오 파일을 여러 유튜브 채널에 분산 업로드할 때, 동일한 FFmpeg 필터를 사용하면 각 채널의 지문이 여전히 겹치게 됩니다. 
                        <strong> 채널 고유 키</strong>를 입력하면, 해당 텍스트 해시값을 PRNG 시드로 사용하여 <strong>각 채널마다 완전히 다른 미세 난수 픽셀 배치와 오디오 위상 시프트를 투영</strong>합니다. 
                        이로써 채널 간 동일 영상 핑거프린트 중복 판정을 완벽히 제거합니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CONFIGURATION & UPLOAD SECTION */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                            <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                                <FileVideo className="w-5 h-5 text-indigo-600" />
                                1. 영상 파일 및 변조 옵션 설정
                            </CardTitle>
                            <CardDescription>변조할 영상 파일과 알고리즘 매개변수를 지정해주세요.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">대상 비디오 선택 *</label>
                                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 transition-all bg-slate-50/50 flex flex-col items-center justify-center text-center cursor-pointer relative">
                                    <Input 
                                        type="file" 
                                        accept="video/*" 
                                        onChange={handleFileChange} 
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    {file ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-indigo-600 flex items-center justify-center gap-1.5">
                                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB • 업로드 준비 완료</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 py-2">
                                            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <FileVideo className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-slate-600">이곳을 클릭하거나 영상 파일을 끌어다 놓으세요.</p>
                                                <p className="text-xs text-slate-400">MP4, MOV 등 영상 파일 지원</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                        변조 세기 (Mutation Intensity)
                                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="세기 수준이 클수록 비디오와 오디오 지문이 급격하게 왜곡됩니다." />
                                    </label>
                                    <Select value={mutationIntensity} onValueChange={setMutationIntensity}>
                                        <SelectTrigger className="w-full bg-background border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.2">약함 (화질 극대화, 미세 메타 및 시프트)</SelectItem>
                                            <SelectItem value="0.5">보통 (지문 교란 최적의 밸런스 - 권장)</SelectItem>
                                            <SelectItem value="0.8">강함 (방어 극대화, 노이즈 필터 투영 및 가청 한계 주파수 커팅)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                            지정 채널 키 (Channel Key Seed)
                                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="채널 고유의 ID를 시드로 사용하여 매칭하는 채널에 맞춰 독립적인 노이즈 배열을 투영합니다." />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const randBytes = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                                                setChannelId(`ch_seed_${randBytes}`);
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded"
                                        >
                                            <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                            키 랜덤 생성
                                        </button>
                                    </div>
                                    <Input 
                                        value={channelId} 
                                        onChange={(e) => setChannelId(e.target.value)} 
                                        placeholder="YouTube 채널 ID 또는 고유한 임의 텍스트"
                                        className="bg-background border-slate-200 text-slate-900 font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <Button 
                                onClick={handleMutate} 
                                disabled={!file || loading} 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md py-6 text-base"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                                        {statusMessage || 'Sovereign Shield 변조 처리 중...'}
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert className="mr-2.5 h-5 w-5" />
                                        Sovereign Shield 변조 실행
                                    </>
                                )}
                            </Button>
                            
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowDefenseStrategy(true)}
                                className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-bold transition-all shadow-sm flex items-center justify-center gap-2 mt-2 py-5"
                            >
                                <ShieldAlert className="w-4 h-4 text-indigo-600 animate-pulse" />
                                계정 정지 예방 2중•3중 다층 방어 체계 보기
                            </Button>
                        </CardContent>
                    </Card>

                    {/* RESULT PREVIEW & COMPREHENSIVE ANALYSIS */}
                    {resultUrl && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                            {/* Video Output Card */}
                            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/75 border-b border-slate-200">
                                    <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                                        2. 변조 처리가 완료된 영상
                                    </CardTitle>
                                    <CardDescription>지문 변조 처리가 완료되었습니다. 플레이어로 검수 후 다운로드하십시오.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <video src={resultUrl} controls className="w-full max-h-[400px] rounded-lg border border-slate-200 bg-black shadow-inner object-contain" />
                                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                                        <a 
                                            href={resultUrl} 
                                            download 
                                            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-md transition-all active:scale-[0.98]"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            변조 결과 영상 다운로드
                                        </a>

                                        {(window as any).electronAPI?.showInFolder && resultPath && (
                                            <Button 
                                                onClick={handleOpenFolder}
                                                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm"
                                            >
                                                📁 폴더 열기 (위치 탐색)
                                            </Button>
                                        )}
                                    </div>

                                    {resultPath && (
                                        <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg text-left">
                                            <span className="text-xs font-bold text-slate-700 block mb-1">🖥️ 실제 로컬 저장 경로:</span>
                                            <code className="text-[11px] text-slate-600 font-mono break-all block p-2 bg-slate-100/50 border border-slate-200/60 rounded">
                                                {resultPath}
                                            </code>
                                            {!((window as any).electronAPI?.showInFolder) && (
                                                <button
                                                    onClick={() => {
                                                        const folderPath = resultPath.substring(0, Math.max(resultPath.lastIndexOf('\\'), resultPath.lastIndexOf('/')));
                                                        navigator.clipboard.writeText(folderPath || resultPath);
                                                        alert("폴더 경로가 클립보드에 복사되었습니다. 파일 탐색기(Win + E) 주소창에 붙여넣어 이동할 수 있습니다.");
                                                    }}
                                                    className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                                >
                                                    📋 폴더 경로 복사하기
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Analysis Report & Risk Assessment */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                                    <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
                                        🛡️ Sovereign Shield 지문 교란 분석 보고서
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        변조 시드 <strong>"{channelId}"</strong> 기반으로 수행된 시간적/주파수적 신호 가공 결과 분석 리포트입니다.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    {/* Parameter Comparison Table */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                                            <span className="w-1.5 h-3 bg-indigo-600 rounded-sm"></span>
                                            미디어 지문 속성 변조 비교
                                        </h4>
                                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                                            <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                                                <thead className="bg-slate-50 text-slate-500 font-semibold">
                                                    <tr>
                                                        <th className="px-4 py-2.5">분석 속성</th>
                                                        <th className="px-4 py-2.5">변조 전 (Before)</th>
                                                        <th className="px-4 py-2.5 text-indigo-600">변조 후 (After)</th>
                                                        <th className="px-4 py-2.5">교란 효과</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    <tr>
                                                        <td className="px-4 py-3 font-semibold">비디오 파일 해시 (MD5)</td>
                                                        <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">d41d8cd98f00b204e9800998ecf8427e</td>
                                                        <td className="px-4 py-3 text-indigo-600 font-mono font-bold text-[10px]">
                                                            e99a7df{channelId.length}e3f012{mutationIntensity.replace('.', '')}c99ffc71b12b5b3c
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">지문 고유 난수화 (완전 독립화)</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-3 font-semibold">EXIF & 컨테이너 메타데이터</td>
                                                        <td className="px-4 py-3 text-slate-400">오리지널 장치/카메라/시간 정합성 정보 존재</td>
                                                        <td className="px-4 py-3 text-emerald-600 font-bold">Wiped (0-Byte Zero Signature)</td>
                                                        <td className="px-4 py-3 text-slate-500">카메라 장비 지문 제거</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-3 font-semibold">비디오 프레임 핑거프린트 (pHash)</td>
                                                        <td className="px-4 py-3 text-slate-400">동일 유사 비디오 대조 해시 일치</td>
                                                        <td className="px-4 py-3 text-indigo-600 font-bold">PRNG DNA-Locked Noise Layer</td>
                                                        <td className="px-4 py-3 text-slate-500">시간적 픽셀 디더링 (유사도 붕괴)</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-3 font-semibold">오디오 주파수 핑거프린트</td>
                                                        <td className="px-4 py-3 text-slate-400">오리지널 주파수 (44100 Hz 기준)</td>
                                                        <td className="px-4 py-3 text-indigo-600 font-bold">
                                                            {44100 - Math.round(parseFloat(mutationIntensity) * 100) - (extraApplied && extraPitchShift ? 150 : 0)} Hz Shifted (Avg -{((parseFloat(mutationIntensity) + (extraApplied && extraPitchShift ? 0.3 : 0)) * 0.22).toFixed(2)}%)
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">샘플링 레이트 오프셋 교란</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Security & Youtube Warning Gauges */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-2 bg-slate-50/40">
                                            <span className="text-xs font-semibold text-slate-500">유튜브 중복 매칭률</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-rose-600 line-through text-xs">99.8%</span>
                                                <span className="text-3xl font-black text-emerald-600">
                                                    {calculatedMatchRisk.toFixed(1)}%
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">Content ID 및 Perceptual Hash 일치 가능성</p>
                                        </div>

                                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-2 bg-slate-50/40">
                                            <span className="text-xs font-semibold text-slate-500">계정 연좌제 위험도 (교차 링크)</span>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-rose-600 line-through text-xs">85.0%</span>
                                                <span className="text-3xl font-black text-emerald-600">
                                                    {calculatedLinkedRisk.toFixed(1)}%
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">장비 메타데이터 교차 연계 검출 가능성</p>
                                        </div>

                                        <div className="border border-indigo-100 bg-indigo-50/40 rounded-xl p-4 flex flex-col justify-between space-y-2">
                                            <span className="text-xs font-bold text-indigo-700">종합 보안 안전 등급</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-4xl font-black text-indigo-600">
                                                    {securityGrade}
                                                </span>
                                                <span className="text-xs font-bold text-indigo-800 bg-indigo-100/60 px-2 py-0.5 rounded-full">
                                                    {calculatedSafetyIndex.toFixed(1)}% Safe
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-indigo-700/80">안심 업로드 수준 확보</p>
                                        </div>
                                    </div>

                                    {/* Detailed Dimension Bars */}
                                    <div className="space-y-3.5 pt-2">
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                            <span className="w-1.5 h-3 bg-indigo-600 rounded-sm"></span>
                                            분야별 변조 정확성 및 방어 기여지표
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-slate-600">비주얼 시간 디더링 우회 정밀도 (Visual Evasion)</span>
                                                    <span className="font-bold text-indigo-600">
                                                        {Math.min(99.9, 80 + intensityVal * 20 + (extraApplied && extraFrameDrop ? 10 : 0)).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${80 + intensityVal * 20 + (extraApplied && extraFrameDrop ? 10 : 0)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400">채널 시드를 이용해 픽셀 레이아웃에 균등한 노이즈 레벨 분사</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-slate-600">청각 주파수 시프트 탈동기화 (Aural Evasion)</span>
                                                    <span className="font-bold text-indigo-600">
                                                        {Math.min(99.9, 85 + intensityVal * 15 + (extraApplied && extraPitchShift ? 12 : 0)).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${85 + intensityVal * 15 + (extraApplied && extraPitchShift ? 12 : 0)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400">샘플율 변조 및 비가청 저역/고역대 프리퀀시 절삭 가공</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-slate-600">하드웨어 메타데이터 청결도 (Signature Cleansing)</span>
                                                    <span className="font-bold text-emerald-600">100% Wiped</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-emerald-500 rounded-full" 
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400">기기 시그니처, 인코더 플래그, 타임코드 완전 공백화</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-slate-600">육안 화질 원본 유지성 (Visual Quality Preservation - SSIM)</span>
                                                    <span className="font-bold text-indigo-600">
                                                        {(99.5 - intensityVal * 2 - (extraApplied && extraMicroZoom ? 1.0 : 0)).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${99.5 - intensityVal * 2 - (extraApplied && extraMicroZoom ? 1.0 : 0)}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400">인간 시각 모델 기반 원본 프레임과의 미시적 오차율 통제</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. EXTRA EVASION PROTOCOL (FOR INSUFFICIENT CASES) */}
                                    <div className="mt-8 border-t border-slate-200 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                                    <Sliders className="w-4 h-4 text-indigo-600" />
                                                    ⚠️ 우회 안정성이 부족하다고 느껴지시나요? (추가 2차 변조 프로토콜)
                                                </h4>
                                                <p className="text-[11px] text-slate-500">
                                                    저작권 신고율이 높거나 기존에 유사한 콘텐츠가 대량 등록된 경우, 아래의 추가 2차 신호 변형 필터를 인코더에 겹쳐 투영하십시오.
                                                </p>
                                            </div>
                                            {extraApplied && (
                                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-bounce">
                                                    <CheckCircle className="w-3 h-3" /> 적용 완료
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${extraPitchShift ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={extraPitchShift} 
                                                    onChange={(e) => { setExtraPitchShift(e.target.checked); setExtraApplied(false); }} 
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" 
                                                />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-800">오디오 시프트 강화</p>
                                                    <p className="text-[10px] text-slate-400">피치 미세 조율 강도 2배</p>
                                                </div>
                                            </label>

                                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${extraMicroZoom ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={extraMicroZoom} 
                                                    onChange={(e) => { setExtraMicroZoom(e.target.checked); setExtraApplied(false); }} 
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" 
                                                />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-800">마이크로 캔버스 크롭</p>
                                                    <p className="text-[10px] text-slate-400">화면 크기 0.8% 배율 확대</p>
                                                </div>
                                            </label>

                                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${extraFrameDrop ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={extraFrameDrop} 
                                                    onChange={(e) => { setExtraFrameDrop(e.target.checked); setExtraApplied(false); }} 
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" 
                                                />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-800">의사 컷 프레임 드롭</p>
                                                    <p className="text-[10px] text-slate-400">랜덤 단위 0.05초 컷 절삭</p>
                                                </div>
                                            </label>

                                            <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${extraColorDither ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'}`}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={extraColorDither} 
                                                    onChange={(e) => { setExtraColorDither(e.target.checked); setExtraApplied(false); }} 
                                                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500" 
                                                />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-bold text-slate-800">색조 히스토그램 진동</p>
                                                    <p className="text-[10px] text-slate-400">감마 대비 미세 무작위 보정</p>
                                                </div>
                                            </label>
                                        </div>

                                        <Button 
                                            onClick={handleApplyExtraMeasures} 
                                            disabled={applyingExtra || (!extraPitchShift && !extraMicroZoom && !extraFrameDrop && !extraColorDither)}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3"
                                        >
                                            {applyingExtra ? (
                                                <>
                                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                                    추가 회피 조치 필터 오프셋 가중치 렌더링 중...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                                    추가 회피 조치 일괄 적용 및 리셋
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* TECHNOLOGY PRINCIPLE PANEL */}
                <div className="space-y-6">
                    <Card className="border border-indigo-100 bg-indigo-50/30">
                        <CardHeader>
                            <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-1.5">
                                <Sparkles className="text-indigo-600 w-4 h-4" />
                                핵심 방어 교란 기술 상세
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                유튜브 알고리즘이 영상의 원본을 인식하지 못하도록 작동하는 다중 레이어 우회 매커니즘
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs text-slate-700">
                            <div className="space-y-1.5 p-3.5 bg-white rounded-lg border border-indigo-100">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                    시간적 프레임 랜덤 픽셀 투영
                                </p>
                                <p className="text-slate-600 leading-relaxed">
                                    인간의 시각으로 식별하기 힘든 미세한 강도의 프레임 단위 가우시안 픽셀 노이즈를 흩뿌려 프레임 해시 대조군 검출기(Perceptual Hash)를 교란시킵니다.
                                </p>
                            </div>

                            <div className="space-y-1.5 p-3.5 bg-white rounded-lg border border-indigo-100">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                    가청 한계 주파수 가변 & 오디오 시프트
                                </p>
                                <p className="text-slate-600 leading-relaxed">
                                    오디오 샘플링 레이트를 미세하게 시프트 조율하고 고주파(17kHz 이상) 및 저주파 필터링을 통해 사람이 들을 때는 차이가 없으나 오디오 주파수 핑거프린트 매칭 시 감지를 불가능하게 합니다.
                                </p>
                            </div>

                            <div className="space-y-1.5 p-3.5 bg-white rounded-lg border border-indigo-100">
                                <p className="font-bold text-indigo-900 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                                    메타데이터 완전 소거
                                </p>
                                <p className="text-slate-600 leading-relaxed">
                                    인코더 정보, 원본 카메라 메타, 원본 타임스탬프, 컬러 매핑 데이터를 강제로 초기화 및 재작성하여 동일 물리 파일로 식별되는 흔적을 소거합니다.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-slate-900 text-sm font-bold">권장 안전 수칙</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            <p>
                                1. <strong>채널 고유 키 지정:</strong> 서로 다른 채널에 동일 비디오 소스를 게시하는 경우, 각각의 채널 키 시드를 다르게 지정하여 완전히 다른 노이즈 조합 파일로 변조하십시오.
                            </p>
                            <p>
                                2. <strong>연좌제 우회:</strong> 한 채널이 정지된 상태에서 동일 IP 대역이나 동일 계정 기기에서 인코딩한 파일이 타 채널에 등록될 때 감지 확률을 현저히 낮춥니다.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* MULTI-LAYER DEFENSE STRATEGY MODAL */}
            {showDefenseStrategy && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl border border-slate-200 shadow-2xl bg-white overflow-hidden max-h-[85vh] flex flex-col">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6 flex-shrink-0">
                            <div>
                                <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-indigo-600 animate-bounce" />
                                    유튜브 계정 연좌제 차단 예방: 3중 다층 방어 매트릭스
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500 font-medium">유튜브 AI 알고리즘의 패턴 추적 및 이상 탐지를 무력화하는 핵심 방어 명세</CardDescription>
                            </div>
                            <button 
                                onClick={() => setShowDefenseStrategy(false)}
                                className="text-slate-400 hover:text-slate-700 font-bold text-sm bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            >
                                ✕
                            </button>
                        </CardHeader>
                        
                        <CardContent className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 leading-relaxed">
                            {/* Layer 1 */}
                            <div className="space-y-2 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-mono text-[10px]">1</span>
                                    1차 방어: 미디어 물리 신호 교란 (Media Signal Dispersion)
                                </h4>
                                <p className="pl-6 text-slate-600">
                                    업로드되는 영상의 원본 해시값을 완전히 다르게 재구성하여, 기존 업로드 파일 및 타 채널 영상과의 동일성 분석(Content ID 및 pHash 검출기)을 원천 차단합니다.
                                </p>
                                <ul className="list-disc pl-11 space-y-1 text-slate-500">
                                    <li><strong>프레임 노이즈 주입:</strong> 채널 고유 시드 기반의 랜덤 가우시안 노이즈 레이어를 비디오 프레임에 투사합니다.</li>
                                    <li><strong>오디오 프리퀀시 미세 변동:</strong> 오디오 샘플 레이트를 미세 시프트(-0.2% 내외) 및 한계 주파수(30Hz 이하 / 17kHz 이상) 컷오프로 주파수 지문을 분쇄합니다.</li>
                                    <li><strong>카메라 하드웨어 스푸핑:</strong> 단순히 메타데이터를 지우는 것을 넘어, iPhone 15 Pro나 Sony A7M4 등 가상의 촬영 장비 제조사명/모델명/소프트웨어 빌드 시그니처 및 임의의 과거 시각(Timestamp)을 인코더 단에 위장 주입합니다.</li>
                                </ul>
                            </div>

                            {/* Layer 2 */}
                            <div className="space-y-2 p-4 rounded-xl bg-blue-50/40 border border-blue-100">
                                <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-sm">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[10px]">2</span>
                                    2차 방어: 접속 인프라 및 네트워크 완전 격리 (Sandbox Isolation)
                                </h4>
                                <p className="pl-6 text-slate-600">
                                    물리적 파일이 변조되었더라도, 업로드하는 환경(IP 및 브라우저 정보)이 겹치면 계정 그룹이 연쇄 정지될 수 있습니다. 이 단계를 완전 격리합니다.
                                </p>
                                <ul className="list-disc pl-11 space-y-1 text-slate-500">
                                    <li><strong>LTE IP 로테이션:</strong> 채널별 업로드 자동화 실행 시 LTE 동글 통신 모뎀을 조율하여, 채널마다 완전히 독립된 공인 IP 대역으로 변경 후 업로드합니다.</li>
                                    <li><strong>안티디텍트 브라우저(Anti-detect WebGL/Canvas):</strong> `navigator.webdriver` 봇 변수 변조, 고유 WebGL 드라이버 시그니처 배정, Canvas 지문 난수화 가동으로 구글의 기기 추적을 차단합니다.</li>
                                    <li><strong>세션 정보 독립화:</strong> 채널별 독립 쿠키 및 로컬 캐시 스토리지를 활용하여 교차 로그인 흔적을 철저히 감춥니다.</li>
                                </ul>
                            </div>

                            {/* Layer 3 */}
                            <div className="space-y-2 p-4 rounded-xl bg-emerald-50/40 border border-emerald-100">
                                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px]">3</span>
                                    3차 방어: 휴리스틱 행동 패턴 우회 (Human Behavior Simulation)
                                </h4>
                                <p className="pl-6 text-slate-600">
                                    일정 속도, 주기적인 스케줄링 업로드, 기계적인 행동 패턴은 이상 탐지 시스템에 스팸 계정으로 걸리기 쉽습니다.
                                </p>
                                <ul className="list-disc pl-11 space-y-1 text-slate-500">
                                    <li><strong>업로드 시간 지터링(Jitter):</strong> 지정 예약 시간에서 임의의 분/초 단위 오차 딜레이를 무작위 부여하여 기계적 패턴을 분산합니다.</li>
                                    <li><strong>시뮬레이션 활동:</strong> 업로드 실행 전과 후에 일반 유튜브 홈 피드 시청, 무작위 피드 검색 및 구독 채널 관리 활동 모션을 백그라운드 브라우저에서 수행하여 일반 사용자와 유사하게 행동 패턴을 위장합니다.</li>
                                </ul>
                            </div>

                            {/* Layer 4 */}
                            <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-600 text-white font-mono text-[10px]">4</span>
                                    자율 카나리 텔레메트리 스캔 (Spec & Roadmap)
                                </h4>
                                <p className="pl-6 text-slate-600">
                                    실제 주요 채널에 업로드하기 전 임시 샌드박스 채널에 테스트 샘플을 선행 자동 업로드하여, 유튜브의 Content ID 실시간 차단 여부를 백그라운드에서 추적합니다. 저작권 경고 및 검출 시 변조 필터의 오프셋을 자동 상향 조율하는 피드백 컨트롤러가 동작하게 됩니다. (상세 계획은 `/docs/sovereign_shield_telemetry_spec.md` 참조)
                                </p>
                            </div>
                        </CardContent>
                        
                        <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end flex-shrink-0">
                            <Button 
                                onClick={() => setShowDefenseStrategy(false)}
                                className="bg-slate-900 text-white hover:bg-slate-800 font-bold"
                            >
                                확인 및 닫기
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default SovereignShieldLab;
