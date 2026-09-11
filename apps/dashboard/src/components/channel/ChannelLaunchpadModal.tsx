import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Tv, Sparkles, Layers, ShieldCheck, Cpu, ArrowRight, 
    Zap, CheckCircle2, Loader2, X, Globe, Radio, Lock, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

interface ChannelLaunchpadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const ChannelLaunchpadModal: React.FC<ChannelLaunchpadModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const queryClient = useQueryClient();
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Form State
    const [channelTitle, setChannelTitle] = useState('');
    const [referenceUrl, setReferenceUrl] = useState('');
    const [assignedComboModel, setAssignedComboModel] = useState('viraloop-fast');
    const [primaryWorkflowMode, setPrimaryWorkflowMode] = useState('keyword_only');
    const [autonomyLevel, setAutonomyLevel] = useState<'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'>('LEVEL_2');
    const [autoPublishThreshold, setAutoPublishThreshold] = useState(90);
    const [dailyTargetCount, setDailyTargetCount] = useState(2);
    const [personaStyle, setPersonaStyle] = useState('0.8초 쨉쨉이 도파민 쇼츠 어투');
    const [forbiddenWords, setForbiddenWords] = useState('비방, 가짜뉴스, 선정성, 자극적 단어');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Quick presets based on genre
    const handleApplyGenrePreset = (genre: string) => {
        if (genre === 'yadam') {
            setChannelTitle('조선 야담 & 기이한 미스터리');
            setPersonaStyle('흡입력 높은 옛날이야기 구어체 & 반전 스토리텔링');
            setAssignedComboModel('viraloop-yadam');
            setPrimaryWorkflowMode('keyword_only');
        } else if (genre === 'economy') {
            setChannelTitle('1분 머니 팩트 & 억만장자 스토리');
            setPersonaStyle('신뢰감 있는 3040 직장인 타겟 지식 큐레이션');
            setAssignedComboModel('viraloop-economy');
            setPrimaryWorkflowMode('script_present');
        } else if (genre === 'anime') {
            setChannelTitle('서브컬처 밈 & 숏폼 애니 연구소');
            setPersonaStyle('빠른 템포 1020 유머 감각 & 0.8초 쨉쨉이 컷 전환');
            setAssignedComboModel('viraloop-anime');
            setPrimaryWorkflowMode('video_present');
        } else {
            setChannelTitle('글로벌 킬러 후킹 쇼츠');
            setPersonaStyle('첫 3초 충격 질문 & 다이내믹 사운드 이펙트');
            setAssignedComboModel('viraloop-fast');
            setPrimaryWorkflowMode('minimal_hook');
        }
        toast.info(`'${genre}' 추천 장르 프리셋이 자동 적용되었습니다.`);
    };

    // Simulate AI Reference Analysis
    const handleAnalyzeReference = () => {
        if (!referenceUrl.trim()) {
            toast.error('참고할 레퍼런스 채널 URL 또는 핸들을 입력해 주세요.');
            return;
        }
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            if (!channelTitle) {
                setChannelTitle('벤치마크 떡상 복제 1호기');
            }
            setPersonaStyle('레퍼런스 채널 0.8초 쨉쨉이 템포 및 3초 충격 의문형 공식 복제');
            setStep(2);
            toast.success('레퍼런스 채널 DNA(말투, 쨉쨉이 템포, 보이스) 분석 및 기본값 채번 완료!');
        }, 800);
    };

    // Submit Mutation
    const launchMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                title: channelTitle.trim() || '신규 자율 채널',
                reference_url: referenceUrl.trim() || null,
                assigned_combo_model: assignedComboModel,
                primary_workflow_mode: primaryWorkflowMode,
                autonomy_level: autonomyLevel,
                auto_publish_threshold: autoPublishThreshold,
                daily_target_count: dailyTargetCount,
                persona_style: personaStyle,
                forbidden_words: forbiddenWords.split(',').map(s => s.trim()).filter(Boolean)
            };
            const res = await api.post('/brand-channels/launchpad/clone', payload);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || '채널과 2단계 관리자가 성공적으로 임명되었습니다!');
            queryClient.invalidateQueries({ queryKey: ['directors_status'] });
            queryClient.invalidateQueries({ queryKey: ['channels'] });
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (err: any) => {
            toast.error('채널 런치패드 생성 실패: ' + (err.response?.data?.detail || err.message));
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 select-none">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
                                    신규 채널 디렉터 원스톱 런치패드 (Channel Launchpad)
                                </h2>
                                <Badge variant="outline" className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 border-indigo-500/30">
                                    Tier 2 관리자 임명
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                레퍼런스 채널의 떡상 DNA를 복제하여 2단계 관리자(ChannelDirector)를 즉시 탄생시킵니다.
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Step Indicators */}
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { num: 1, label: '1. 레퍼런스 벤치마킹' },
                        { num: 2, label: '2. 3대 축 & 제작 모드' },
                        { num: 3, label: '3. 점진적 자율성 레벨' },
                    ].map(s => (
                        <button
                            key={s.num}
                            type="button"
                            onClick={() => setStep(s.num as any)}
                            className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                                step === s.num
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Step 1: Reference Ingestion & DNA Extraction */}
                {step === 1 && (
                    <div className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground flex items-center justify-between">
                                <span>새로 운영할 채널 명칭</span>
                                <span className="text-[11px] text-muted-foreground font-normal">예: [야담] 미스터리 서사 2호기</span>
                            </label>
                            <Input
                                value={channelTitle}
                                onChange={(e) => setChannelTitle(e.target.value)}
                                placeholder="생성할 채널의 명칭을 입력하세요"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground flex items-center justify-between">
                                <span>참고할 레퍼런스 채널 (유튜브 / 틱톡)</span>
                                <span className="text-[11px] text-indigo-500 font-bold">DNA 자동 추출 지원</span>
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    value={referenceUrl}
                                    onChange={(e) => setReferenceUrl(e.target.value)}
                                    placeholder="예: https://youtube.com/@mystery_story 또는 @tiktok_handle"
                                    className="h-9 text-xs"
                                />
                                <Button
                                    type="button"
                                    onClick={handleAnalyzeReference}
                                    disabled={isAnalyzing}
                                    className="h-9 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-1.5 rounded-xl"
                                >
                                    {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    AI 스타일 분석
                                </Button>
                            </div>
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 space-y-2">
                            <span className="text-[11px] font-bold text-muted-foreground block">
                                💡 또는 인기 장르 원클릭 템플릿으로 빠른 시작:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { id: 'yadam', label: '📜 역사/야담 반전형' },
                                    { id: 'economy', label: '💰 경제/재테크 팩트형' },
                                    { id: 'anime', label: '🎨 서브컬처/애니 밈' },
                                    { id: 'fast', label: '⚡ 초고속 3초 킬러 후킹' },
                                ].map(p => (
                                    <Button
                                        key={p.id}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApplyGenrePreset(p.id)}
                                        className="h-7 text-xs font-bold border-border/80"
                                    >
                                        {p.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: 3-Axis Binding & Workflow Mode */}
                {step === 2 && (
                    <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Axis 3: Assigned Combo Model */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground flex items-center gap-1.5">
                                    <Cpu className="w-3.5 h-3.5 text-blue-500" />
                                    [축 3] 전담 콤보 모델
                                </label>
                                <select
                                    value={assignedComboModel}
                                    onChange={(e) => setAssignedComboModel(e.target.value)}
                                    className="w-full h-9 px-2.5 rounded-xl bg-muted/40 border border-border text-xs font-black text-foreground focus:outline-none cursor-pointer"
                                >
                                    <option value="viraloop-fast">viraloop-fast (Llama 3.3 / 쨉쨉이 쇼츠)</option>
                                    <option value="viraloop-story">viraloop-story (Claude 3.7 / R1 심층 서사)</option>
                                    <option value="viraloop-economy">viraloop-economy (경제 팩트 분석)</option>
                                    <option value="viraloop-yadam">viraloop-yadam (역사/야담 구어체 특화)</option>
                                    <option value="viraloop-anime">viraloop-anime (서브컬처 밈 특화)</option>
                                    <option value="viraloop-global">viraloop-global (Gemini 2.5 Pro 글로벌)</option>
                                </select>
                            </div>

                            {/* Axis 2: Primary Workflow Mode */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-foreground flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                                    [축 2] 주력 제작 모드
                                </label>
                                <select
                                    value={primaryWorkflowMode}
                                    onChange={(e) => setPrimaryWorkflowMode(e.target.value)}
                                    className="w-full h-9 px-2.5 rounded-xl bg-muted/40 border border-border text-xs font-black text-foreground focus:outline-none cursor-pointer"
                                >
                                    <option value="keyword_only">키워드 발굴 창작형 (트렌드 ➔ 9-Wave ➔ Flow AI)</option>
                                    <option value="script_present">대본 보유형 (대본 ➔ Critic-85 ➔ 보이스/영상)</option>
                                    <option value="video_present">영상 가공형 (원본 ➔ 씬절삭 ➔ 9:16 블러 ➔ 후킹)</option>
                                    <option value="minimal_hook">초고속 쾌속양산 (3초 킬러 후킹 ➔ 즉시 조립)</option>
                                    <option value="deep_narrative">심층 HITL 결재형 (심층 스토리 ➔ 텔레그램 승인)</option>
                                </select>
                            </div>
                        </div>

                        {/* Axis 1: Persona & Style */}
                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                [축 1] 채널 고유 페르소나 & 톤앤매너
                            </label>
                            <Input
                                value={personaStyle}
                                onChange={(e) => setPersonaStyle(e.target.value)}
                                placeholder="예: 몰입도 높은 0.8초 쨉쨉이 어투 & 반전 카피"
                                className="h-9 text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-rose-500" />
                                절대 금기어 (정보 오염 차단)
                            </label>
                            <Input
                                value={forbiddenWords}
                                onChange={(e) => setForbiddenWords(e.target.value)}
                                placeholder="쉼표(,)로 구분"
                                className="h-9 text-xs font-mono"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Gradual Autonomy Level */}
                {step === 3 && (
                    <div className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="font-bold text-foreground">점진적 자율성 레벨 (Autonomy Level)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    {
                                        level: 'LEVEL_1',
                                        title: 'Level 1: 수동 결재',
                                        badge: '초기 웜업',
                                        desc: '모든 대본이 텔레그램으로 전송되며 대표님 승인(/approve) 시에만 영상 렌더 착수',
                                        color: 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400'
                                    },
                                    {
                                        level: 'LEVEL_2',
                                        title: 'Level 2: 조건부 자율 (추천)',
                                        badge: '안정화 추천',
                                        desc: 'Critic 90점 이상은 무검수 즉시 렌더 ➔ 캡컷 조립 직행! (85~89점만 결재 요청)',
                                        color: 'border-indigo-500/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400'
                                    },
                                    {
                                        level: 'LEVEL_3',
                                        title: 'Level 3: 완전 무인 비행',
                                        badge: '100% FSD',
                                        desc: '85점만 넘으면 골든타임 자동 발행 완결, 대표님께는 완료 보고 푸시만 전송',
                                        color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                                    },
                                ].map(item => (
                                    <div
                                        key={item.level}
                                        onClick={() => setAutonomyLevel(item.level as any)}
                                        className={`p-3 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                                            autonomyLevel === item.level
                                                ? `${item.color} ring-2 ring-indigo-500 shadow-xs font-bold`
                                                : 'border-border bg-card opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-black text-xs text-foreground">{item.title}</span>
                                            <Badge variant="outline" className="text-[9px] font-mono">
                                                {item.badge}
                                            </Badge>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed font-normal">
                                            {item.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily Target & Threshold */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 space-y-1">
                                <span className="font-bold text-foreground block">일일 목표 발행 편수</span>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 5].map(cnt => (
                                        <Button
                                            key={cnt}
                                            type="button"
                                            size="sm"
                                            variant={dailyTargetCount === cnt ? 'default' : 'outline'}
                                            onClick={() => setDailyTargetCount(cnt)}
                                            className="h-7 text-xs font-bold px-2.5 rounded-lg"
                                        >
                                            {cnt}편
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-muted/30 border border-border/70 space-y-1">
                                <span className="font-bold text-foreground block">Level 2 무검수 자동 패스 기준점</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-indigo-500 font-mono">{autoPublishThreshold}점 이상</span>
                                    <span className="text-[10px] text-muted-foreground">(Critic-85 채점 기준)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-border/80 pt-4">
                    <div>
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setStep((step - 1) as any)}
                                className="text-xs font-bold rounded-xl"
                            >
                                이전 단계
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 3 ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setStep((step + 1) as any)}
                                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1"
                            >
                                다음 단계
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                disabled={launchMutation.isPending}
                                onClick={() => launchMutation.mutate()}
                                className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl shadow-md gap-1.5 px-4 h-9"
                            >
                                {launchMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        관리자 임명 중...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 fill-current" />
                                        채널 디렉터 임명 및 자율 주행 가동
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChannelLaunchpadModal;
