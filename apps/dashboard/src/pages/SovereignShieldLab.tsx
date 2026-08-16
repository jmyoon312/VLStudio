import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Loader2, ShieldAlert, HelpCircle, ShieldCheck, Download,
    AlertTriangle, FileVideo, RefreshCw, Zap, CheckCircle,
    Activity, BarChart3, Lock, ArrowRightLeft, FlaskConical,
    GitBranch, Fingerprint, ScanLine, Volume2, Settings2,
    AudioWaveform, Cpu, Database, Layers, Sparkles, Play,
    Pause, ChevronDown, ChevronRight,
} from 'lucide-react';
import axios from 'axios';

// ──────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────
interface MutationLayer {
    id: string;
    label: string;
    value: string;
    effect: string;
    category: '비디오' | '오디오' | '메타데이터' | '구조';
}
interface MutationReport {
    seed: number;
    channel_id: string;
    intensity: number;
    device_profile: { make: string; model: string; software: string; handler: string; creation_time: string };
    gop_size: number;
    audio_rate: number;
    noise_strength: number;
    gamma: number;
    saturation: number;
    applied_layers: MutationLayer[];
    layer_count: number;
    ffmpeg_vf: string;
    ffmpeg_af: string;
}
interface AnalysisItem {
    id: string;
    label: string;
    category: string;
    original_val: string;
    mutated_val: string;
    diff_score: number;
    status: string;
    sufficient: boolean;
    extra_key: string | null;
    description: string;
}
interface CompareResult {
    file_hash: { original: string; mutated: string; is_different: boolean };
    metadata: { original: Record<string, any>; mutated: Record<string, any> };
    video_phash_similarity: number;
    audio: { similarity_pct: number; sample_rate_a: number; sample_rate_b: number; spectral_centroid_a: number; spectral_centroid_b: number; centroid_diff_pct: number };
    analysis_items: AnalysisItem[];
    overall_evasion_score: number;
    insufficient_items: string[];
}

// ──────────────────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────────────────
const defaultSeed = () =>
    `ch_seed_${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const catColor: Record<string, string> = {
    '비디오':    'bg-sky-100 text-sky-700',
    '오디오':    'bg-indigo-100 text-indigo-700',
    '메타데이터':'bg-emerald-100 text-emerald-700',
    '구조':      'bg-amber-100 text-amber-700',
};
const catIcon: Record<string, React.ReactNode> = {
    '비디오':    <ScanLine className="w-3.5 h-3.5" />,
    '오디오':    <Volume2 className="w-3.5 h-3.5" />,
    '메타데이터':<Database className="w-3.5 h-3.5" />,
    '구조':      <GitBranch className="w-3.5 h-3.5" />,
};

const StatusBadge = ({ status }: { status: string }) => {
    if (status === '충분') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle className="w-2.5 h-2.5"/>충분</span>;
    if (status === '부분') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="w-2.5 h-2.5"/>부분</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><AlertTriangle className="w-2.5 h-2.5"/>{status}</span>;
};

const ScoreBar = ({ score, sufficient }: { score: number; sufficient: boolean }) => (
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
        <span className={`text-xs font-black ${sufficient ? 'text-emerald-600' : score > 30 ? 'text-amber-600' : 'text-rose-500'}`}>
            {Math.min(score, 100).toFixed(0)}%
        </span>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${sufficient ? 'bg-emerald-500' : score > 30 ? 'bg-amber-400' : 'bg-rose-400'}`}
                 style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
    </div>
);

// 안전한 동기 재생 헬퍼
const safeSyncPlay = async (a: HTMLVideoElement | null, b: HTMLVideoElement | null) => {
    if (!a || !b) return;
    try {
        a.currentTime = 0;
        b.currentTime = 0;
        await Promise.all([a.play(), b.play()]);
    } catch (err: any) {
        if (err?.name !== 'AbortError') console.warn('Sync play error:', err);
    }
};

// ──────────────────────────────────────────────────────────
// Toast
// ──────────────────────────────────────────────────────────
const Toast = ({ msg }: { msg: string }) => msg ? (
    <div className="fixed top-5 right-5 z-[300] bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-3 duration-300 flex items-center gap-2.5">
        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />{msg}
    </div>
) : null;

// ──────────────────────────────────────────────────────────
// 변조 완료 보고서 컴포넌트
// ──────────────────────────────────────────────────────────
const MutationReportPanel = ({ report, analysis }: { report: MutationReport, analysis?: any }) => {
    const [expanded, setExpanded] = useState(true);
    const [showCmd, setShowCmd] = useState(false);

    const byCategory = report.applied_layers.reduce((acc, l) => {
        if (!acc[l.category]) acc[l.category] = [];
        acc[l.category].push(l);
        return acc;
    }, {} as Record<string, MutationLayer[]>);

    return (
        <Card className="border border-emerald-200 bg-emerald-50/30 shadow-sm mt-4">
            {analysis && (
                <div className="p-4 border-b border-emerald-100 bg-white rounded-t-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 mb-1">유튜브 연좌제 방어 / 저작권 회피 시뮬레이션 결과</p>
                        {analysis.overall_evasion_score >= 80 ? (
                            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                                <ShieldCheck className="w-5 h-5"/> 안전 (Safe) — 핑거프린팅 시스템이 완전히 새로운 영상으로 인식합니다.
                            </p>
                        ) : analysis.overall_evasion_score >= 50 ? (
                            <p className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                                <ShieldAlert className="w-5 h-5"/> 주의 (Warning) — 일부 메타데이터나 특징이 남아있을 수 있습니다.
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                                <AlertTriangle className="w-5 h-5"/> 위험 (Danger) — 원본 영상과 매우 유사하여 제재 대상이 될 수 있습니다.
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400">종합 회피율</p>
                        <p className={`text-3xl font-black ${analysis.overall_evasion_score >= 80 ? 'text-emerald-500' : analysis.overall_evasion_score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                            {analysis.overall_evasion_score}%
                        </p>
                    </div>
                </div>
            )}
            <button
                className="w-full flex items-center justify-between p-4 hover:bg-emerald-50/60 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 rounded-xl text-white">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-emerald-900">
                            ✅ 변조 완료 — {report.layer_count}개 레이어 적용됨
                        </p>
                        <p className="text-xs text-emerald-700">
                            채널 시드: <code className="font-mono">{report.channel_id}</code> · 세기: {report.intensity} · 장비: {report.device_profile.make} {report.device_profile.model}
                        </p>
                    </div>
                </div>
                {expanded ? <ChevronDown className="w-4 h-4 text-emerald-600" /> : <ChevronRight className="w-4 h-4 text-emerald-600" />}
            </button>

            {expanded && (
                <div className="px-4 pb-5 space-y-4">
                    {/* 핵심 수치 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: '프레임 노이즈 강도', value: `${report.noise_strength}`, unit: '/8 max' },
                            { label: 'GOP 구조', value: `${report.gop_size} 프레임`, unit: '' },
                            { label: '오디오 샘플레이트', value: `${report.audio_rate.toLocaleString()}`, unit: 'Hz' },
                            { label: '감마 조율', value: `γ=${report.gamma}`, unit: '' },
                        ].map(item => (
                            <div key={item.label} className="bg-white rounded-xl border border-emerald-100 p-3">
                                <p className="text-[10px] text-slate-500 font-medium">{item.label}</p>
                                <p className="text-sm font-black text-emerald-700 mt-0.5">{item.value}<span className="text-[10px] font-normal ml-0.5 text-slate-400">{item.unit}</span></p>
                            </div>
                        ))}
                    </div>

                    {analysis && (
                        <div className="bg-white rounded-xl border border-emerald-100 p-4">
                            <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                                <ArrowRightLeft className="w-4 h-4 text-indigo-600"/>📊 원본 vs 변조 상세 수치 비교 (Evasion Metrics)
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                                <table className="min-w-full divide-y divide-slate-100 text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-3 py-2 text-left">분석 항목</th>
                                            <th className="px-3 py-2 text-left">원본값</th>
                                            <th className="px-3 py-2 text-left text-indigo-600">변조 후 수치</th>
                                            <th className="px-3 py-2 text-center w-[70px]">상태</th>
                                            <th className="px-3 py-2 text-center w-[90px]">회피력</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analysis.analysis_items.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`p-1 rounded ${item.sufficient ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                                            {catIcon[item.category] ?? <Activity className="w-3 h-3"/>}
                                                        </span>
                                                        <span className="font-bold text-slate-800">{item.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 font-mono text-[10px] max-w-[120px] truncate">{item.original_val}</td>
                                                <td className="px-3 py-2 text-indigo-700 font-bold text-[10px] max-w-[120px] truncate">{item.mutated_val}</td>
                                                <td className="px-3 py-2 text-center"><StatusBadge status={item.status}/></td>
                                                <td className="px-3 py-2"><ScoreBar score={item.diff_score} sufficient={item.sufficient}/></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* 장비 프로파일 */}
                    <div className="bg-white rounded-xl border border-emerald-100 p-3">
                        <p className="text-[10px] font-bold text-slate-500 mb-2 flex items-center gap-1"><Cpu className="w-3 h-3" />위장된 하드웨어 프로파일</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {[
                                ['제조사', report.device_profile.make],
                                ['모델', report.device_profile.model],
                                ['소프트웨어', report.device_profile.software],
                                ['촬영 시각', report.device_profile.creation_time],
                            ].map(([k, v]) => (
                                <div key={k}>
                                    <span className="text-slate-400 text-[10px]">{k}</span>
                                    <p className="font-semibold text-slate-700 truncate">{v}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 카테고리별 적용 레이어 */}
                    <div className="space-y-3">
                        {Object.entries(byCategory).map(([cat, layers]) => (
                            <div key={cat}>
                                <div className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${catColor[cat] || 'bg-slate-100 text-slate-600'}`}>
                                    {catIcon[cat]}{cat} ({layers.length}개)
                                </div>
                                <div className="space-y-1.5">
                                    {layers.map(layer => (
                                        <div key={layer.id} className="bg-white rounded-lg border border-slate-100 p-3 flex flex-col md:flex-row md:items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800">{layer.label}</p>
                                                <p className="text-[10px] font-mono text-indigo-600 mt-0.5">{layer.value}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-400 md:max-w-[260px] flex-shrink-0">{layer.effect}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* FFmpeg 명령 보기 */}
                    <div>
                        <button onClick={() => setShowCmd(!showCmd)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1">
                            {showCmd ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            FFmpeg 필터 명령 {showCmd ? '숨기기' : '보기'}
                        </button>
                        {showCmd && (
                            <div className="mt-2 space-y-1.5">
                                <div className="bg-slate-900 rounded-lg p-3">
                                    <p className="text-[9px] text-slate-400 mb-1">-vf</p>
                                    <code className="text-[9px] text-emerald-400 break-all font-mono">{report.ffmpeg_vf}</code>
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3">
                                    <p className="text-[9px] text-slate-400 mb-1">-af</p>
                                    <code className="text-[9px] text-cyan-400 break-all font-mono">{report.ffmpeg_af}</code>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
};

// ──────────────────────────────────────────────────────────
// TAB A: 단일 영상 변조
// ──────────────────────────────────────────────────────────
const MutationTab = () => {
    const [file, setFile]             = useState<File | null>(null);
    const [loading, setLoading]       = useState(false);
    const [status, setStatus]         = useState('');
    const [resultUrl, setResultUrl]   = useState<string | null>(null);
    const [resultPath, setResultPath] = useState<string | null>(null);
    const [report, setReport]         = useState<MutationReport | null>(null);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [intensity, setIntensity]   = useState('0.5');
    const [channelId, setChannelId]   = useState(defaultSeed);
    const [toast, setToast]           = useState('');
    const [sync, setSync]             = useState(false);

    const origRef   = useRef<HTMLVideoElement>(null);
    const resultRef = useRef<HTMLVideoElement>(null);
    const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    const handleFileChange = (f: File) => {
        setFile(f);
        setResultUrl(null);
        setResultPath(null);
        setReport(null);
        setAnalysisResult(null);
        setStatus('');
        setSync(false);
    };

    const handleMutate = async () => {
        if (!file) return;
        setLoading(true);
        setResultUrl(null);
        setResultPath(null);
        setReport(null);
        stageTimers.current.forEach(clearTimeout);

        const stages: [number, string][] = [
            [1200, '메타데이터 소거 및 장비 프로파일 위장 주입 중...'],
            [3000, 'Temporal Sparse Noise 프레임 투영 중...'],
            [5500, '오디오 샘플레이트 시프트 + 주파수 컷오프 중...'],
            [8000, 'GOP 구조 랜덤화 및 비트스트림 재구성 중...'],
        ];
        stageTimers.current = stages.map(([d, m]) => setTimeout(() => setStatus(m), d));

        const fd = new FormData();
        fd.append('file', file);
        fd.append('intensity', intensity);
        fd.append('channel_id', channelId);
        try {
            const res = await axios.post('/api/lab/mutate', fd);
            setResultUrl(res.data.url);
            setResultPath(res.data.path);
            setReport(res.data.mutation_report);
            setAnalysisResult(res.data.analysis_result);
            setStatus('✅ 변조 완료!');
            showToast('변조 완료! 아래 상세 보고서를 확인하세요.');
        } catch (e: any) {
            setStatus('❌ 오류: ' + (e?.response?.data?.detail || e.message));
            showToast('변조 처리에 실패했습니다.');
        } finally {
            setLoading(false);
            stageTimers.current.forEach(clearTimeout);
        }
    };

    const handleSyncToggle = async () => {
        const ov = origRef.current, rv = resultRef.current;
        if (!ov || !rv) return;
        if (sync) {
            ov.pause(); rv.pause();
            setSync(false);
        } else {
            setSync(true);
            await safeSyncPlay(ov, rv);
        }
    };

    return (
        <div className="space-y-6">
            <Toast msg={toast} />
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white flex-shrink-0"><Zap className="w-5 h-5 fill-white" /></div>
                <p className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-indigo-900">채널 고유 키</strong>를 채널마다 다르게 설정하면 동일 영상이라도 채널별로 완전히 다른 지문 패턴이 투영됩니다. 변조 완료 후 레이어별 상세 보고서가 제공됩니다.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* 설정 패널 */}
                <div className="lg:col-span-2">
                    <Card className="border border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                            <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-indigo-600" />변조 설정
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 text-center cursor-pointer transition-all bg-slate-50/50 min-h-[90px] flex items-center justify-center">
                                <Input type="file" accept="video/*" onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                {file ? (
                                    <div className="pointer-events-none">
                                        <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-indigo-600 truncate max-w-[220px]">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div><FileVideo className="w-7 h-7 text-slate-300 mx-auto mb-1.5" /><p className="text-sm text-slate-400">클릭하거나 영상 파일 드래그</p></div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">변조 세기</label>
                                <Select value={intensity} onValueChange={setIntensity}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0.2">1단계: 약함 (화질/음질 최우선)</SelectItem>
                                        <SelectItem value="0.5">2단계: 보통 (권장 밸런스)</SelectItem>
                                        <SelectItem value="0.8">3단계: 강함 (방어력 극대화)</SelectItem>
                                        <SelectItem value="1.2">4단계: 극한 (연좌제/저작권 원천 차단)</SelectItem>
                                        <SelectItem value="2.0">5단계: 파괴적 (시청각 열화 감수)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700">채널 키 Seed</label>
                                    <button onClick={() => setChannelId(defaultSeed())} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5"/>랜덤</button>
                                </div>
                                <Input value={channelId} onChange={e => setChannelId(e.target.value)} className="font-mono text-xs" />
                            </div>

                            <Button onClick={handleMutate} disabled={!file || loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 text-sm">
                                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>{status || '처리 중...'}</> : <><ShieldAlert className="mr-2 h-5 w-5"/>Sovereign Shield 변조 실행</>}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* 영상 비교 */}
                <div className="lg:col-span-3">
                    <Card className="border border-slate-200 shadow-sm h-full">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-slate-800 text-base flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-indigo-600"/>원본 vs 변조 결과</CardTitle>
                                {resultUrl && file && (
                                    <button onClick={handleSyncToggle} className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${sync ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {sync ? <Pause className="w-3 h-3"/> : <Play className="w-3 h-3"/>}
                                        {sync ? '동기 정지' : '동기 재생'}
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"/>원본</p>
                                    {file ? (
                                        <video ref={origRef} src={URL.createObjectURL(file)} controls={!sync} className="w-full aspect-video rounded-lg border border-slate-200 bg-black object-contain" />
                                    ) : (
                                        <div className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-300">영상 선택 대기</div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>변조 결과</p>
                                    {resultUrl ? (
                                        <video ref={resultRef} src={resultUrl} controls={!sync} className="w-full aspect-video rounded-lg border border-indigo-200 bg-black object-contain" />
                                    ) : (
                                        <div className="w-full aspect-video rounded-lg border-2 border-dashed border-indigo-100 bg-indigo-50/30 flex items-center justify-center text-indigo-200 text-center p-3">
                                            {loading ? <div className="flex flex-col items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-indigo-400"/><span className="text-[10px] text-indigo-400">{status}</span></div> : <span className="text-xs">변조 실행 후 표시</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {resultUrl && (
                                <div className="flex gap-2 justify-center">
                                    <a href={resultUrl} download className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-md">
                                        <Download className="w-4 h-4 mr-2"/>변조 결과 다운로드
                                    </a>
                                    {(window as any).electronAPI?.showInFolder && resultPath && (
                                        <Button onClick={() => (window as any).electronAPI.showInFolder(resultPath)} variant="outline" className="text-sm font-bold">📁 폴더</Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 변조 완료 보고서 */}
            {report && <MutationReportPanel report={report} analysis={analysisResult} />}
        </div>
    );
};

// ──────────────────────────────────────────────────────────
// TAB B: 두 영상 비교 분석 + 추가 변조
// ──────────────────────────────────────────────────────────
const CompareTab = () => {
    const [origFile,    setOrigFile]    = useState<File | null>(null);
    const [mutatedFile, setMutatedFile] = useState<File | null>(null);
    const [analyzing,   setAnalyzing]  = useState(false);
    const [result,      setResult]     = useState<CompareResult | null>(null);
    const [toast,       setToast]      = useState('');
    const [checkedExtras, setCheckedExtras] = useState<Record<string, boolean>>({});
    const [applyingExtra, setApplyingExtra] = useState(false);
    const [extraReport, setExtraReport] = useState<{ url: string; path: string; report: MutationReport } | null>(null);
    const [channelId, setChannelId] = useState(defaultSeed);
    const [intensity, setIntensity] = useState('0.5');
    const [sync, setSync] = useState(false);

    const origRef    = useRef<HTMLVideoElement>(null);
    const mutatedRef = useRef<HTMLVideoElement>(null);
    const showToast  = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    const handleCompare = async () => {
        if (!origFile || !mutatedFile) return;
        setAnalyzing(true);
        setResult(null);
        setExtraReport(null);
        const fd = new FormData();
        fd.append('original', origFile);
        fd.append('mutated',  mutatedFile);
        try {
            const res = await axios.post('/api/lab/compare', fd, { timeout: 120000 });
            setResult(res.data);
            const autoCheck: Record<string, boolean> = {};
            (res.data.insufficient_items as string[]).forEach((id: string) => {
                const item = res.data.analysis_items.find((i: AnalysisItem) => i.id === id);
                if (item?.extra_key) autoCheck[item.extra_key] = true;
            });
            setCheckedExtras(autoCheck);
            showToast(`분석 완료! 미흡 ${res.data.insufficient_items.length}개 항목이 자동 체크됐습니다.`);
        } catch (e: any) {
            showToast('분석 실패: ' + (e?.response?.data?.detail || e.message || '서버 오류'));
        } finally {
            setAnalyzing(false);
        }
    };

    const handleApplyExtra = async () => {
        if (!mutatedFile) return;
        setApplyingExtra(true);
        const fd = new FormData();
        fd.append('file', mutatedFile);
        fd.append('intensity', intensity);
        fd.append('channel_id', channelId);
        Object.entries(checkedExtras).forEach(([k, v]) => fd.append(k, String(v)));
        try {
            const res = await axios.post('/api/lab/mutate', fd);
            setExtraReport({ url: res.data.url, path: res.data.path, report: res.data.mutation_report });
            showToast('추가 변조 완료!');
        } catch (e: any) {
            showToast('추가 변조 실패: ' + (e?.response?.data?.detail || e.message));
        } finally {
            setApplyingExtra(false);
        }
    };

    const handleSyncToggle = async () => {
        if (sync) {
            origRef.current?.pause();
            mutatedRef.current?.pause();
            setSync(false);
        } else {
            setSync(true);
            await safeSyncPlay(origRef.current, mutatedRef.current);
        }
    };

    const extraLabels: Record<string, { label: string; desc: string }> = {
        extra_pitch_shift:     { label: '오디오 피치 강화',            desc: 'atempo 피치 독립 조율' },
        extra_micro_zoom:      { label: '마이크로 캔버스 크롭',          desc: '0.5~1.2% 확대 → pHash 기준점 이동' },
        extra_frame_drop:      { label: '의사 컷 프레임 드롭',           desc: '랜덤 N프레임마다 1프레임 제거' },
        extra_color_dither:    { label: '색조 히스토그램 진동',           desc: '색조 ±3°, 밝기 미세 교란' },
        extra_gop_shuffle:     { label: 'GOP 키프레임 극단 셔플',         desc: 'I-프레임 배치 30~240 랜덤화' },
        extra_temporal_attack: { label: 'Temporal Consistency Attack', desc: 'PTS ±0.2% 시퀀스 교란 (2026)' },
        extra_audio_phase:     { label: 'DWT 오디오 위상 교란',          desc: 'aphaser 주파수 도메인 위상 변조' },
        extra_luma_dct:        { label: 'Luma DCT 계수 교란',           desc: 'gblur 기반 pHash 주파수 분쇄' },
    };

    const score = result?.overall_evasion_score ?? 0;
    const insufficientCount = result?.insufficient_items.length ?? 0;

    return (
        <div className="space-y-6">
            <Toast msg={toast} />

            {/* STEP 1: 업로드 */}
            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                    <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600"/>STEP 1 — 두 영상 업로드
                    </CardTitle>
                    <CardDescription className="text-xs">
                        왼쪽에 <strong>원본 영상</strong>, 오른쪽에 <strong>이미 변조된 영상</strong>을 각각 업로드하세요.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* 원본 */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400"/>🎬 원본 영상 (Before)</p>
                            <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-all bg-slate-50 min-h-[80px] flex items-center justify-center">
                                <Input type="file" accept="video/*" onChange={e => { if (e.target.files?.[0]) { setOrigFile(e.target.files[0]); setResult(null); }}} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                {origFile ? (
                                    <div className="pointer-events-none"><ShieldCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1"/><p className="text-xs font-bold text-slate-600 truncate max-w-[160px]">{origFile.name}</p><p className="text-[10px] text-slate-400">{(origFile.size/1024/1024).toFixed(1)} MB</p></div>
                                ) : (
                                    <div><FileVideo className="w-6 h-6 text-slate-300 mx-auto mb-1"/><p className="text-xs text-slate-400">클릭 또는 드래그</p></div>
                                )}
                            </div>
                            {origFile && <video ref={origRef} src={URL.createObjectURL(origFile)} controls={!sync} className="w-full aspect-video rounded-xl border border-slate-200 bg-black object-contain"/>}
                        </div>

                        {/* 변조된 영상 */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-indigo-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"/>🛡️ 변조된 영상 (After)</p>
                            <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer transition-all bg-indigo-50/30 min-h-[80px] flex items-center justify-center">
                                <Input type="file" accept="video/*" onChange={e => { if (e.target.files?.[0]) { setMutatedFile(e.target.files[0]); setResult(null); }}} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                {mutatedFile ? (
                                    <div className="pointer-events-none"><ShieldCheck className="w-4 h-4 text-indigo-500 mx-auto mb-1"/><p className="text-xs font-bold text-indigo-600 truncate max-w-[160px]">{mutatedFile.name}</p><p className="text-[10px] text-indigo-400">{(mutatedFile.size/1024/1024).toFixed(1)} MB</p></div>
                                ) : (
                                    <div><FileVideo className="w-6 h-6 text-indigo-200 mx-auto mb-1"/><p className="text-xs text-indigo-300">클릭 또는 드래그</p></div>
                                )}
                            </div>
                            {mutatedFile && <video ref={mutatedRef} src={URL.createObjectURL(mutatedFile)} controls={!sync} className="w-full aspect-video rounded-xl border border-indigo-200 bg-black object-contain"/>}
                        </div>
                    </div>

                    {origFile && mutatedFile && (
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={handleSyncToggle} className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all ${sync ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                {sync ? <Pause className="w-3.5 h-3.5"/> : <Play className="w-3.5 h-3.5"/>}
                                {sync ? '동기 정지' : '두 영상 동기 재생'}
                            </button>
                        </div>
                    )}

                    <Button onClick={handleCompare} disabled={!origFile || !mutatedFile || analyzing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 text-sm">
                        {analyzing
                            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/>분석 중... (pHash · MFCC 오디오 · 메타데이터 비교)</>
                            : <><Activity className="mr-2 h-5 w-5"/>두 영상 차이 비교 분석 시작</>}
                    </Button>
                    {analyzing && <p className="text-center text-xs text-slate-400">영상 크기에 따라 30초~2분이 소요될 수 있습니다.</p>}
                </CardContent>
            </Card>

            {/* STEP 2: 분석 결과 */}
            {result && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className={`border col-span-2 md:col-span-1 ${score >= 70 ? 'border-emerald-100 bg-emerald-50/40' : score >= 40 ? 'border-amber-100 bg-amber-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
                            <CardContent className="p-4">
                                <p className="text-xs font-semibold text-slate-500 mb-1">종합 변조 효과</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{score.toFixed(0)}%</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">전체 항목 평균 차이도</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs font-semibold text-slate-500 mb-1">pHash 유사도</p>
                                <span className={`text-3xl font-black ${result.video_phash_similarity < 80 ? 'text-emerald-600' : 'text-rose-500'}`}>{result.video_phash_similarity}%</span>
                                <p className="text-[10px] text-slate-400 mt-1">{result.video_phash_similarity < 80 ? '✅ 충분히 교란' : '⚠️ 추가 변조 필요'}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs font-semibold text-slate-500 mb-1">오디오 MFCC 유사도</p>
                                <span className={`text-3xl font-black ${result.audio.similarity_pct < 85 ? 'text-emerald-600' : 'text-rose-500'}`}>{result.audio.similarity_pct}%</span>
                                <p className="text-[10px] text-slate-400 mt-1">{result.audio.similarity_pct < 85 ? '✅ 오디오 교란됨' : '⚠️ 추가 오디오 변조 필요'}</p>
                            </CardContent>
                        </Card>
                        <Card className="border border-slate-200">
                            <CardContent className="p-4">
                                <p className="text-xs font-semibold text-slate-500 mb-1">미흡 항목</p>
                                <span className={`text-3xl font-black ${insufficientCount === 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{insufficientCount}개</span>
                                <p className="text-[10px] text-slate-400 mt-1">{insufficientCount === 0 ? '✅ 모든 항목 충분' : '⚠️ 추가 변조 권장'}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 py-4">
                            <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-indigo-600"/>STEP 2 — 항목별 변조 차이 분석 결과
                            </CardTitle>
                            <CardDescription className="text-xs">
                                <span className="text-rose-600 font-semibold">빨간 항목</span>은 변조가 미흡하여 추가 변조가 권장됩니다.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 text-xs">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-[200px]">분석 항목</th>
                                            <th className="px-4 py-3 text-left">원본값</th>
                                            <th className="px-4 py-3 text-left text-indigo-600">변조된 영상값</th>
                                            <th className="px-4 py-3 text-center w-[70px]">상태</th>
                                            <th className="px-4 py-3 text-center w-[100px]">차이도</th>
                                            <th className="px-4 py-3 text-left text-slate-400">분석 설명</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.analysis_items.map(item => (
                                            <tr key={item.id} className={`transition-colors ${!item.sufficient ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/50'}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`p-1.5 rounded-lg ${item.sufficient ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                                            {catIcon[item.category] ?? <Activity className="w-3.5 h-3.5"/>}
                                                        </span>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 leading-tight">{item.label}</p>
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${catColor[item.category] || 'bg-slate-100 text-slate-500'} font-medium`}>{item.category}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 font-mono text-[10px] max-w-[140px]"><span className="block truncate">{item.original_val}</span></td>
                                                <td className="px-4 py-3 text-indigo-700 font-bold text-[10px] max-w-[160px]"><span className="block truncate">{item.mutated_val}</span></td>
                                                <td className="px-4 py-3 text-center"><StatusBadge status={item.status}/></td>
                                                <td className="px-4 py-3"><ScoreBar score={item.diff_score} sufficient={item.sufficient}/></td>
                                                <td className="px-4 py-3 text-slate-400 text-[10px] max-w-[200px]">
                                                    {item.description}
                                                    {!item.sufficient && item.extra_key && <span className="block mt-0.5 text-rose-500 font-semibold">→ 아래 추가 변조에서 선택 가능</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* STEP 3: 추가 변조 */}
                    <Card className="border border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 bg-slate-50/30 py-4">
                            <CardTitle className="text-slate-900 text-base font-bold flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-indigo-600"/>STEP 3 — 미흡 항목 추가 변조 실행
                            </CardTitle>
                            <CardDescription className="text-xs">
                                분석 결과 미흡 항목의 추가 변조 방법이 자동 체크되었습니다. 조정 후 <strong>변조된 영상에 적층 변조</strong>를 실행하세요.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            {insufficientCount === 0 ? (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0"/>
                                    <p className="text-sm font-semibold text-emerald-800">모든 변조 항목이 충분합니다! 추가 변조가 필요하지 않습니다.</p>
                                </div>
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
                                    <p className="text-xs text-amber-800"><strong>{insufficientCount}개 항목</strong>이 미흡하여 관련 추가 변조가 자동 체크되었습니다.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {Object.entries(extraLabels).map(([key, { label, desc }]) => {
                                    const isInsufficiency = result.analysis_items.some(i => i.extra_key === key && !i.sufficient);
                                    return (
                                        <label key={key} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${checkedExtras[key] ? (isInsufficiency ? 'bg-rose-50/60 border-rose-300 shadow-sm' : 'bg-indigo-50/60 border-indigo-300 shadow-sm') : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={!!checkedExtras[key]} onChange={e => setCheckedExtras(p => ({ ...p, [key]: e.target.checked }))} className="mt-0.5 rounded text-indigo-600" />
                                            <div className="space-y-0.5 flex-1">
                                                <p className="text-xs font-bold text-slate-800 leading-tight">{label}</p>
                                                <p className="text-[10px] text-slate-500">{desc}</p>
                                                {isInsufficiency && <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">⚠️ 미흡 자동선택</span>}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">변조 세기</label>
                                    <Select value={intensity} onValueChange={setIntensity}>
                                        <SelectTrigger className="text-xs"><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0.2">1단계: 약함</SelectItem>
                                            <SelectItem value="0.5">2단계: 보통 (권장)</SelectItem>
                                            <SelectItem value="0.8">3단계: 강함</SelectItem>
                                            <SelectItem value="1.2">4단계: 극한</SelectItem>
                                            <SelectItem value="2.0">5단계: 파괴적</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-700">채널 키</label>
                                        <button onClick={() => setChannelId(defaultSeed())} className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">랜덤</button>
                                    </div>
                                    <Input value={channelId} onChange={e => setChannelId(e.target.value)} className="font-mono text-xs"/>
                                </div>
                            </div>

                            <Button onClick={handleApplyExtra} disabled={applyingExtra || !mutatedFile || !Object.values(checkedExtras).some(Boolean)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-5">
                                {applyingExtra ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>추가 변조 처리 중...</> : <><Lock className="mr-2 h-4 w-4"/>선택 항목 추가 변조 실행 (변조된 영상에 적용)</>}
                            </Button>
                        </CardContent>
                    </Card>

                    {extraReport && (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0"/>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-emerald-800">추가 변조 완료!</p>
                                </div>
                                <a href={extraReport.url} download className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                                    <Download className="w-3.5 h-3.5 mr-1.5"/>다운로드
                                </a>
                            </div>
                            {extraReport.report && <MutationReportPanel report={extraReport.report}/>}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ──────────────────────────────────────────────────────────
// 메인
// ──────────────────────────────────────────────────────────
const SovereignShieldLab = () => {
    const [tab, setTab] = useState<'mutate' | 'compare'>('mutate');

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><ShieldAlert className="w-6 h-6"/></span>
                        유튜브 연좌제 방어 변조
                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">Sovereign Shield v5</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Content ID / pHash 핑거프린팅 우회 · 채널 연좌제 방어 · 미디어 지문 교란 실험실</p>
                </div>
                <div className="flex items-center gap-1.5 self-start bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5"/>정지/경고 대처 전용
                </div>
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setTab('mutate')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${tab === 'mutate' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ShieldAlert className="w-4 h-4"/>① 영상 변조
                    <span className="text-[10px] text-slate-400 font-normal hidden md:inline">(영상 1개 → 변조 + 상세 보고서)</span>
                </button>
                <button onClick={() => setTab('compare')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${tab === 'compare' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <ArrowRightLeft className="w-4 h-4"/>② 비교 분석 & 추가 변조
                    <span className="text-[10px] text-slate-400 font-normal hidden md:inline">(원본 + 변조 영상 비교 → 추가 변조)</span>
                </button>
            </div>

            {tab === 'mutate'  && <MutationTab />}
            {tab === 'compare' && <CompareTab />}
        </div>
    );
};

export default SovereignShieldLab;
