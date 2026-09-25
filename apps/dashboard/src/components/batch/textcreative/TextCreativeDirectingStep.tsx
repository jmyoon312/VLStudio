import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Music,
  Camera,
  Layers,
  Layout,
  Users,
  MessageSquare,
  Wand2,
  X,
  Plus,
  Flame,
  Heart,
  Smile,
  Zap,
  BookOpen,
  Mic,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ViraLoopVoiceMatrix, VIRALOOP_16_VOICES } from './ViraLoopVoiceMatrix';

export type ProductionTarget = 'ssul' | 'classic' | 'gunlimbo' | 'instagram';
export type TonePreset = 'emotional' | 'cider' | 'mystery' | 'humor' | 'serious';

interface TextCreativeDirectingStepProps {
  sourceMode: 'short-to-short' | 'long-to-short';
  onSourceModeChange: (mode: 'short-to-short' | 'long-to-short') => void;
  productionTarget: ProductionTarget;
  onProductionTargetChange: (target: ProductionTarget) => void;
  analysisModel: string;
  onAnalysisModelChange: (model: string) => void;
  cutPacing: 'normal' | 'loose';
  onCutPacingChange: (pacing: 'normal' | 'loose') => void;
  beatSync: boolean;
  onBeatSyncChange: (sync: boolean) => void;
  freezeFrame: boolean;
  onFreezeFrameChange: (freeze: boolean) => void;

  // 1. 등장인물 Focus Persons (J2.Z)
  focusPersons: string[];
  onFocusPersonsChange: (persons: string[]) => void;
  onDetectAiPersons?: () => void;
  isDetectingPersons?: boolean;

  // 2. 5대 문체 및 톤 프롬프트 (JZ.a)
  tonePreset: TonePreset;
  onTonePresetChange: (tone: TonePreset) => void;
  tonePrompt: string;
  onTonePromptChange: (prompt: string) => void;

  // 3. 댓글 오버레이 (J0.b)
  includeComments: boolean;
  onIncludeCommentsChange: (inc: boolean) => void;
  commentMode: 'auto' | 'manual';
  onCommentModeChange: (mode: 'auto' | 'manual') => void;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
  manualComments: string;
  onManualCommentsChange: (val: string) => void;

  // 4. [NEW] 바이럴루프 TTS 성우 및 배속 설정
  voiceId: string;
  onVoiceIdChange: (val: string) => void;
  voiceRate: number;
  onVoiceRateChange: (val: number) => void;
  voicePitch: number;
  onVoicePitchChange: (val: number) => void;
}

export const TextCreativeDirectingStep: React.FC<TextCreativeDirectingStepProps> = ({
  sourceMode,
  onSourceModeChange,
  productionTarget,
  onProductionTargetChange,
  analysisModel,
  onAnalysisModelChange,
  cutPacing,
  onCutPacingChange,
  beatSync,
  onBeatSyncChange,
  freezeFrame,
  onFreezeFrameChange,
  focusPersons,
  onFocusPersonsChange,
  onDetectAiPersons,
  isDetectingPersons,
  tonePreset,
  onTonePresetChange,
  tonePrompt,
  onTonePromptChange,
  includeComments,
  onIncludeCommentsChange,
  commentMode,
  onCommentModeChange,
  commentCount,
  onCommentCountChange,
  manualComments,
  onManualCommentsChange,
  voiceId,
  onVoiceIdChange,
  voiceRate,
  onVoiceRateChange,
  voicePitch,
  onVoicePitchChange
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true); // 기본 오픈하여 직관적 조작 지원
  const [personInput, setPersonInput] = useState<string>('');

  const targets: { id: ProductionTarget; label: string; desc: string }[] = [
    { id: 'ssul', label: '썰형 (Ssul)', desc: '헤더바, 작성자, 자막 누적 모드' },
    { id: 'classic', label: '클래식 (Classic)', desc: '중앙 나레이션 골든 템플릿' },
    { id: 'gunlimbo', label: '군림보 (Gunlimbo)', desc: '상하 훅 밴드, 다이내믹 줌' },
    { id: 'instagram', label: '인스타 (Insta)', desc: '흰색 카드 배경, 베댓 오버레이' }
  ];

  const tonePresets: { id: TonePreset; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'emotional', label: '감동 실화', icon: Heart, desc: '가슴 먹먹한 위로와 여운' },
    { id: 'cider', label: '사이다 반전', icon: Zap, desc: '통쾌하고 빠른 사이다 전개' },
    { id: 'mystery', label: '미스터리 야담', icon: Flame, desc: '긴장감 넘치는 비밀 폭로' },
    { id: 'humor', label: '유머·MZ 밈', icon: Smile, desc: '재치 있는 신조어와 티키타카' },
    { id: 'serious', label: '진지·다큐', icon: BookOpen, desc: '신뢰감 있는 다큐멘터리 해설' }
  ];

  const selectedVoice = VIRALOOP_16_VOICES.find(v => v.id === voiceId) || VIRALOOP_16_VOICES[0];

  const handleAddPerson = () => {
    const trimmed = personInput.trim();
    if (trimmed && !focusPersons.includes(trimmed)) {
      onFocusPersonsChange([...focusPersons, trimmed]);
      setPersonInput('');
    }
  };

  const handleRemovePerson = (name: string) => {
    onFocusPersonsChange(focusPersons.filter(p => p !== name));
  };

  const handlePersonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPerson();
    }
  };

  return (
    <section id="tc-step-directing" className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
      {/* 아코디언 헤더 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 text-left cursor-pointer group"
      >
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded border border-border bg-muted/40 font-mono font-bold text-xs text-foreground">
            03
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              세부 연출 옵션 (DIRECTING & TTS)
            </h3>
            <p className="text-[10px] text-muted-foreground">
              8대 성우 음성, 주인공 앵커, 문체 톤앤매너, 댓글 오버레이, 타겟 폼팩터 맞춤 연출
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 요약 칩 바 */}
          <div className="hidden sm:flex items-center gap-1">
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
              {selectedVoice.name} ({voiceRate}x)
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border font-semibold">
              {targets.find(t => t.id === productionTarget)?.label}
            </Badge>
            {focusPersons.length > 0 && (
              <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 font-bold">
                인물 {focusPersons.length}명
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] bg-muted/80 text-foreground border-border font-medium">
              {tonePresets.find(t => t.id === tonePreset)?.label}
            </Badge>
          </div>

          <span className="text-xs text-muted-foreground group-hover:text-foreground font-medium flex items-center gap-0.5">
            {isOpen ? '접기' : '펼치기'}
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {/* 아코디언 바디 */}
      {isOpen && (
        <div className="pt-3 border-t border-border/60 space-y-4">
          {/* 1. [ViraLoop 16종 전역 음성 매트릭스] (쇼츠추천/남성/여성/유머사투리/글로벌 + 원클릭 미리듣기) */}
          <ViraLoopVoiceMatrix
            selectedVoiceId={voiceId}
            onSelectVoice={(vid, recRate) => {
              onVoiceIdChange(vid);
              if (recRate) onVoiceRateChange(recRate);
            }}
            voiceRate={voiceRate}
            onVoiceRateChange={onVoiceRateChange}
            voicePitch={voicePitch}
            onVoicePitchChange={onVoicePitchChange}
          />

          {/* 2. 제작 방식 및 타겟 폼팩터 4대 스튜디오 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Layers className="w-3 h-3 text-primary" />
                제작 방식 (Source Mode)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'short-to-short', label: '숏투숏 (30~45초)' },
                  { id: 'long-to-short', label: '롱투숏 (하이라이트)' }
                ].map(sm => (
                  <button
                    key={sm.id}
                    type="button"
                    onClick={() => onSourceModeChange(sm.id as any)}
                    className={cn(
                      'p-2 rounded-lg border text-center text-xs font-bold transition cursor-pointer',
                      sourceMode === sm.id
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border bg-background hover:bg-muted/40 text-foreground'
                    )}
                  >
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Layout className="w-3 h-3 text-primary" />
                타겟 폼팩터 (4대 주권 스튜디오)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {targets.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onProductionTargetChange(t.id)}
                    className={cn(
                      'p-2 rounded-lg border text-left transition cursor-pointer',
                      productionTarget === t.id
                        ? 'bg-primary/10 border-primary'
                        : 'border-border bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="text-xs font-bold text-foreground">{t.label}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 등장인물(주인공 일관성 앵커 Focus Persons) & AI 자동 감지 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" />
                등장인물 앵커 (Focus Persons — 캐릭터 일관성 수호)
              </label>
              {onDetectAiPersons && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDetectingPersons}
                  onClick={onDetectAiPersons}
                  className="h-6 text-[10px] font-bold px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{isDetectingPersons ? '감지 중...' : '✨ AI 인물 자동 감지'}</span>
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border bg-background">
              {focusPersons.map(person => (
                <span
                  key={person}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-primary/15 text-primary border border-primary/30"
                >
                  {person}
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(person)}
                    className="hover:text-destructive cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={personInput}
                onChange={e => setPersonInput(e.target.value)}
                onKeyDown={handlePersonKeyDown}
                placeholder="인물 입력 후 Enter (예: 엄마, 딸)"
                className="flex-1 min-w-[120px] text-xs bg-transparent border-0 focus:outline-hidden text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* 4. 5대 문체 톤앤매너 프리셋 & 커스텀 지시어 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              서사 문체 프리셋 (Tone & Narrative Style)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {tonePresets.map(preset => {
                const IconComponent = preset.icon;
                const isSelected = tonePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onTonePresetChange(preset.id)}
                    className={cn(
                      'p-2 rounded-lg border text-left transition cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 border-primary'
                        : 'border-border bg-background hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                      <IconComponent className="w-3 h-3 text-primary" />
                      <span>{preset.label}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground truncate mt-0.5">{preset.desc}</div>
                  </button>
                );
              })}
            </div>

            <Input
              type="text"
              value={tonePrompt}
              onChange={e => onTonePromptChange(e.target.value)}
              placeholder="커스텀 연출 지시어 (예: 20대 여성 말투, 씁쓸한 반전 강조, 빠른 속사포)"
              className="h-8 text-xs bg-background border-border"
            />
          </div>

          {/* 5. 쇼츠 댓글 오버레이 모드 */}
          <div className="space-y-2 p-2.5 rounded-lg border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-primary" />
                쇼츠 댓글 오버레이 (시청자 인터랙션 극대화)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tc-include-comments"
                  checked={includeComments}
                  onChange={e => onIncludeCommentsChange(e.target.checked)}
                  className="rounded border-border text-primary cursor-pointer"
                />
                <label htmlFor="tc-include-comments" className="text-xs font-bold text-foreground cursor-pointer">
                  오버레이 켜기
                </label>
              </div>
            </div>

            {includeComments && (
              <div className="pt-2 space-y-2 border-t border-border/40">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">모드:</span>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="comment-mode"
                      checked={commentMode === 'auto'}
                      onChange={() => onCommentModeChange('auto')}
                    />
                    <span>AI 자동 생성 ({commentCount}개)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="comment-mode"
                      checked={commentMode === 'manual'}
                      onChange={() => onCommentModeChange('manual')}
                    />
                    <span>직접 입력</span>
                  </label>
                </div>

                {commentMode === 'manual' ? (
                  <Input
                    type="text"
                    value={manualComments}
                    onChange={e => onManualCommentsChange(e.target.value)}
                    placeholder="표시할 댓글 내용 입력"
                    className="h-8 text-xs bg-background border-border"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">댓글 개수:</span>
                    {[1, 2, 3].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => onCommentCountChange(cnt)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer',
                          commentCount === cnt
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-background text-foreground'
                        )}
                      >
                        {cnt}개
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 6. 컷 템포, 비트 싱크, 프리즈 프레임 토글 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-foreground">컷 템포</span>
              <div className="inline-flex rounded border border-border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => onCutPacingChange('normal')}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded',
                    cutPacing === 'normal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  보통 (2.4s)
                </button>
                <button
                  type="button"
                  onClick={() => onCutPacingChange('loose')}
                  className={cn(
                    'px-2 py-0.5 text-[10px] font-bold rounded',
                    cutPacing === 'loose' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  여유 (3.0s)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Music className="w-3 h-3 text-primary" />
                비트 싱크
              </span>
              <input
                type="checkbox"
                checked={beatSync}
                onChange={e => onBeatSyncChange(e.target.checked)}
                className="rounded border-border text-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-background">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Camera className="w-3 h-3 text-primary" />
                프리즈 프레임
              </span>
              <input
                type="checkbox"
                checked={freezeFrame}
                onChange={e => onFreezeFrameChange(e.target.checked)}
                className="rounded border-border text-primary cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
