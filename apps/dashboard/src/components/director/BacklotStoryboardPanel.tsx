import React, { useState } from 'react';
import { 
    CheckCircle2, 
    Loader2, 
    Sparkles, 
    Film, 
    Layers, 
    Download, 
    ExternalLink, 
    BookmarkPlus, 
    Check, 
    Edit3, 
    Sliders,
    Play,
    Share2,
    FileText,
    Mic,
    Scissors,
    MonitorPlay
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export interface SceneTake {
    scene_index: number;
    start_ms: number;
    end_ms: number;
    duration_ms?: number;
    text: string;
    voice_id?: string;
    status: 'planned' | 'synthesizing' | 'completed' | 'failed';
}

export interface BacklotDeliverable {
    title: string;
    video_path: string;
    receipt_path?: string;
    style?: any;
    recipe?: string;
    content_rules?: string[];
    cues?: any[];
    scenes?: SceneTake[];
    voice_id?: string;
    form_factor?: string;
}

interface BacklotStoryboardPanelProps {
    currentStage?: 'idea' | 'script' | 'scene_plan' | 'assets' | 'compose' | 'completed';
    scriptData?: {
        title: string;
        hook: string;
        voice_id?: string;
        cues: Array<{ start_ms: number; end_ms: number; text: string }>;
    };
    scenes?: SceneTake[];
    deliverable?: BacklotDeliverable | null;
    isGenerating?: boolean;
    onApproveScript?: (editedScript: any) => void;
    onRequestRevision?: (feedback: string) => void;
    onOpenInStudio?: (formFactor: 'classic' | 'ssul' | 'gunlimbo' | 'insta', deliverable: BacklotDeliverable) => void;
    onSavePreset?: (deliverable: BacklotDeliverable) => void;
}

const STAGES = [
    { id: 'idea', label: '1. 기획 & 브리프', icon: Sparkles },
    { id: 'script', label: '2. 대본 승인 게이트', icon: FileText },
    { id: 'scene_plan', label: '3. 콘택트 시트', icon: Layers },
    { id: 'assets', label: '4. 음성/에셋 합성', icon: Mic },
    { id: 'compose', label: '5. 최종 렌더링', icon: MonitorPlay },
];

export const BacklotStoryboardPanel: React.FC<BacklotStoryboardPanelProps> = ({
    currentStage = 'completed',
    scriptData,
    scenes = [],
    deliverable,
    isGenerating = false,
    onApproveScript,
    onRequestRevision,
    onOpenInStudio,
    onSavePreset,
}) => {
    const [activeTab, setActiveTab] = useState<'board' | 'script_gate' | 'export'>('board');
    
    // Editable Script Gate state
    const [editableTitle, setEditableTitle] = useState(scriptData?.title || '');
    const [editableHook, setEditableHook] = useState(scriptData?.hook || '');
    const [editableCues, setEditableCues] = useState(scriptData?.cues || []);
    const [revisionInput, setRevisionInput] = useState('');
    const [isExportingCapcut, setIsExportingCapcut] = useState(false);

    // Sync when scriptData updates
    React.useEffect(() => {
        if (scriptData) {
            setEditableTitle(scriptData.title);
            setEditableHook(scriptData.hook);
            setEditableCues(scriptData.cues || []);
        }
    }, [scriptData]);

    const handleApprove = () => {
        if (onApproveScript) {
            onApproveScript({
                title: editableTitle,
                hook: editableHook,
                voice_id: scriptData?.voice_id || 'google_female_calm',
                cues: editableCues
            });
            toast.success('대본이 승인되었습니다! 씬 구성 및 렌더링을 계속 진행합니다.');
        }
    };

    const handleExportCapCut = async () => {
        if (!deliverable) {
            toast.error('내보낼 비디오 결과물이 없습니다.');
            return;
        }
        setIsExportingCapcut(true);
        try {
            const res = await fetch('/api/sovereign-presets/export-capcut', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: deliverable.title || 'ViraLoop CapCut Export',
                    video_path: deliverable.video_path,
                    cues: deliverable.cues || editableCues,
                    duration_s: 15.0
                })
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`CapCut 드래프트 프로젝트 생성 완료! (ID: ${data.project_id || '성공'})`);
            } else {
                toast.error('CapCut 드래프트 생성에 실패했습니다.');
            }
        } catch (err: any) {
            toast.error(`CapCut 내보내기 오류: ${err.message}`);
        } finally {
            setIsExportingCapcut(false);
        }
    };

    const stageOrder = ['idea', 'script', 'scene_plan', 'assets', 'compose', 'completed'];
    const currentStageIndex = stageOrder.indexOf(currentStage);

    return (
        <div className="flex flex-col h-full bg-card border-l border-border/80 text-foreground overflow-hidden select-none">
            {/* Header: OpenMontage Backlot Living Storyboard */}
            <div className="p-3 border-b border-border/80 bg-muted/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-foreground">Backlot Living Storyboard</span>
                    <Badge variant="outline" className="text-[10px] border-border/80 px-1.5 py-0">
                        OpenMontage Core
                    </Badge>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                    <button
                        type="button"
                        onClick={() => setActiveTab('board')}
                        className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors ${
                            activeTab === 'board' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        콘택트 시트
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('script_gate')}
                        className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors ${
                            activeTab === 'script_gate' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        대본 승인 게이트
                    </button>
                    {deliverable && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('export')}
                            className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors ${
                                activeTab === 'export' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            스튜디오 전송
                        </button>
                    )}
                </div>
            </div>

            {/* 5-Stage Living Progression Tracker */}
            <div className="p-3 border-b border-border/60 bg-card/60 shrink-0">
                <div className="grid grid-cols-5 gap-1 text-center">
                    {STAGES.map((st, idx) => {
                        const isDone = currentStageIndex > idx;
                        const isCurrent = currentStageIndex === idx;
                        return (
                            <div
                                key={st.id}
                                className={`p-1.5 rounded-lg border text-[10px] flex flex-col items-center gap-1 transition-all ${
                                    isDone
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold'
                                        : isCurrent
                                        ? 'bg-primary/10 border-primary/40 text-primary font-bold shadow-xs'
                                        : 'bg-muted/30 border-border/40 text-muted-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-center">
                                    {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                    ) : (
                                        <st.icon className="w-3.5 h-3.5 opacity-60" />
                                    )}
                                </div>
                                <span className="line-clamp-1 leading-tight">{st.label.split('. ')[1]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {activeTab === 'board' && (
                    /* Contact Sheet Takes */
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-primary" />
                                씬별 콘택트 시트 (Scene Takes)
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                총 {scenes.length || editableCues.length}개 컷
                            </span>
                        </div>

                        {(scenes.length > 0 ? scenes : editableCues.map((c, idx) => ({
                            scene_index: idx + 1,
                            start_ms: c.start_ms,
                            end_ms: c.end_ms,
                            text: c.text,
                            voice_id: scriptData?.voice_id || 'google_female_calm',
                            status: 'completed' as const
                        }))).map((take) => (
                            <div
                                key={take.scene_index}
                                className="p-3 rounded-xl border border-border/80 bg-background hover:border-primary/40 transition-all space-y-2 shadow-xs"
                            >
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                                        <span className="w-5 h-5 rounded-md bg-muted flex items-center justify-center text-[10px] text-primary">
                                            #{take.scene_index}
                                        </span>
                                        <span>씬 {take.scene_index}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-mono border-border/80">
                                        {Math.floor(take.start_ms / 1000)}s ~ {Math.floor(take.end_ms / 1000)}s
                                    </Badge>
                                </div>

                                <p className="text-xs text-foreground bg-muted/30 p-2 rounded-lg border border-border/40 font-medium">
                                    "{take.text}"
                                </p>

                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                    <div className="flex items-center gap-1">
                                        <Mic className="w-3 h-3 text-primary" />
                                        <span>{take.voice_id || 'TTS 음성'}</span>
                                    </div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">동기화 완료</span>
                                </div>
                            </div>
                        ))}

                        {scenes.length === 0 && editableCues.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground text-xs border border-dashed border-border/80 rounded-xl space-y-2">
                                <Sparkles className="w-6 h-6 mx-auto text-muted-foreground/60" />
                                <p>대화창에서 영상을 생성하면 실시간 씬 콘택트 시트가 표시됩니다.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'script_gate' && (
                    /* Script Approval Gate */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <div>
                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    대본 승인 게이트 (Script Gate)
                                </h3>
                                <p className="text-[10px] text-muted-foreground">
                                    렌더링 전 제목과 훅, 대사를 직접 수정하거나 승인하세요.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleApprove}
                                className="h-7 text-xs px-2.5 bg-primary text-primary-foreground font-semibold gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                대본 승인
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">영상 대제목</label>
                                <Input
                                    value={editableTitle}
                                    onChange={(e) => setEditableTitle(e.target.value)}
                                    placeholder="영상 대제목"
                                    className="h-8 text-xs bg-background border-border/80"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-semibold text-foreground">첫 3초 훅 멘트</label>
                                <Input
                                    value={editableHook}
                                    onChange={(e) => setEditableHook(e.target.value)}
                                    placeholder="시선 집중 훅 멘트"
                                    className="h-8 text-xs bg-background border-border/80"
                                />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[11px] font-semibold text-foreground">타임코드 자막 대사 목록</label>
                                {editableCues.map((cue, idx) => (
                                    <div key={idx} className="p-2 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>#{idx + 1} 구간</span>
                                            <span className="font-mono">
                                                {cue.start_ms / 1000}s - {cue.end_ms / 1000}s
                                            </span>
                                        </div>
                                        <Input
                                            value={cue.text}
                                            onChange={(e) => {
                                                const updated = [...editableCues];
                                                updated[idx] = { ...updated[idx], text: e.target.value };
                                                setEditableCues(updated);
                                            }}
                                            className="h-7 text-xs bg-background border-border/80"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Natural Language Revision Request */}
                            <div className="pt-3 border-t border-border/60 space-y-2">
                                <span className="text-[11px] font-semibold text-foreground block">AI에게 대본 재작성 요청</span>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        value={revisionInput}
                                        onChange={(e) => setRevisionInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && revisionInput.trim() && onRequestRevision) {
                                                onRequestRevision(revisionInput.trim());
                                                setRevisionInput('');
                                            }
                                        }}
                                        placeholder="예: 결론을 더 감동적으로 바꿔줘, 목소리를 남성으로 변경..."
                                        className="h-8 text-xs bg-background border-border/80 flex-1"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!revisionInput.trim() || isGenerating}
                                        onClick={() => {
                                            if (onRequestRevision && revisionInput.trim()) {
                                                onRequestRevision(revisionInput.trim());
                                                setRevisionInput('');
                                            }
                                        }}
                                        className="h-8 text-xs px-2.5 border-border/80"
                                    >
                                        수정
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'export' && deliverable && (
                    /* Multi-Studio & CapCut Export Bridges */
                    <div className="space-y-4">
                        <div className="pb-2 border-b border-border/60">
                            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Share2 className="w-3.5 h-3.5 text-primary" />
                                4대 전문 스튜디오 및 CapCut 원클릭 전송
                            </h3>
                            <p className="text-[10px] text-muted-foreground">
                                완성된 결과물을 원하는 전문 NLE 환경으로 즉시 전송합니다.
                            </p>
                        </div>

                        {/* Deliverable preview card */}
                        <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2.5 shadow-xs">
                            <span className="text-xs font-bold text-foreground block truncate">
                                {deliverable.title}
                            </span>
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center border border-border/60">
                                <video
                                    src={`/api/files?path=${encodeURIComponent(deliverable.video_path)}`}
                                    controls
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <a
                                    href={`/api/files?path=${encodeURIComponent(deliverable.video_path)}`}
                                    download={`${deliverable.title || 'video'}.mp4`}
                                    className="h-7 px-2.5 text-xs gap-1 border border-border/80 rounded-md inline-flex items-center hover:bg-muted font-medium transition-colors"
                                >
                                    <Download className="w-3 h-3 text-primary" />
                                    MP4 다운로드
                                </a>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onSavePreset && onSavePreset(deliverable)}
                                    className="h-7 text-xs gap-1 border-border/80"
                                >
                                    <BookmarkPlus className="w-3 h-3 text-primary" />
                                    프리셋 저장
                                </Button>
                            </div>
                        </div>

                        {/* CapCut Draft Export */}
                        <div className="p-3 rounded-xl border border-border/80 bg-background space-y-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">CapCut PC 프로젝트 패키징</span>
                                <Badge variant="outline" className="text-[10px]">CapCut Draft JSON</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                컷 편집, 자막 트랙, 오디오 트랙이 분리된 완전한 CapCut 프로젝트로 즉시 내보냅니다.
                            </p>
                            <Button
                                size="sm"
                                onClick={handleExportCapCut}
                                disabled={isExportingCapcut}
                                className="w-full h-8 text-xs font-semibold bg-primary text-primary-foreground gap-1.5"
                            >
                                {isExportingCapcut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                                CapCut 드래프트 프로젝트 생성
                            </Button>
                        </div>

                        {/* 4 Sovereign Studios Direct Bridges */}
                        <div className="space-y-2 pt-2">
                            <span className="text-xs font-bold text-foreground block">4대 독립 폼팩터 스튜디오로 열기</span>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenInStudio && onOpenInStudio('classic', deliverable)}
                                    className="h-9 text-xs justify-start px-2.5 gap-1.5 border-border/80 hover:border-primary/50"
                                >
                                    <Film className="w-3.5 h-3.5 text-primary" />
                                    클래식 스튜디오
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenInStudio && onOpenInStudio('ssul', deliverable)}
                                    className="h-9 text-xs justify-start px-2.5 gap-1.5 border-border/80 hover:border-primary/50"
                                >
                                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                                    썰형 스튜디오
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenInStudio && onOpenInStudio('gunlimbo', deliverable)}
                                    className="h-9 text-xs justify-start px-2.5 gap-1.5 border-border/80 hover:border-primary/50"
                                >
                                    <Sliders className="w-3.5 h-3.5 text-red-500" />
                                    군림보 스튜디오
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onOpenInStudio && onOpenInStudio('insta', deliverable)}
                                    className="h-9 text-xs justify-start px-2.5 gap-1.5 border-border/80 hover:border-primary/50"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                                    인스타 스튜디오
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
