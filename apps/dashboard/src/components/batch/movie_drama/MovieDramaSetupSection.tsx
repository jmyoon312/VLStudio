import React from 'react';
import {
  Upload,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Minus,
  Plus,
  Play,
  Volume2,
  Tv,
  Layers,
  ArrowRight,
  ShieldCheck,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface MovieDramaSetupSettings {
  targetShortsCount: number;
  deliveryMode: 'full_tts' | 'tts_dialogue_mix' | 'subtitles_only';
  layoutPreset: 'full_bleed' | 'title_band';
  seriesMode: boolean;
  voiceId: string;
  styleSettings: Record<string, any>;
}

interface MovieDramaSetupSectionProps {
  selectedVideoPath: string | null;
  selectedVideoName: string | null;
  videoInfo: { duration?: number; size?: number; width?: number; height?: number } | null;
  onSelectVideoFile: (file: File) => void;
  onSelectVideoPath: (path: string) => void;
  settings: MovieDramaSetupSettings;
  onSettingsChange: (newSettings: Partial<MovieDramaSetupSettings>) => void;
  rightsConfirmed: boolean;
  onRightsConfirmedChange: (confirmed: boolean) => void;
  isStarting: boolean;
  onStartAnalysis: () => void;
  existingJob?: any | null;
  onStartNewJob?: () => void;
}

export const MovieDramaSetupSection: React.FC<MovieDramaSetupSectionProps> = ({
  selectedVideoPath,
  selectedVideoName,
  videoInfo,
  onSelectVideoFile,
  onSelectVideoPath,
  settings,
  onSettingsChange,
  rightsConfirmed,
  onRightsConfirmedChange,
  isStarting,
  onStartAnalysis,
  existingJob,
  onStartNewJob
}) => {
  const deliveryModes = [
    {
      value: 'full_tts',
      label: '전체 TTS형',
      description: 'AI 음성이 중심 사건의 도입부터 결과까지 이어줘 처음 보는 사람도 이해하기 쉬워요.',
      segments: ['bg-primary', 'bg-primary', 'bg-primary', 'bg-primary'],
      recommended: true
    },
    {
      value: 'tts_dialogue_mix',
      label: 'TTS·원대사 혼합형',
      description: '배우의 실제 대사를 중심으로 두고, 꼭 필요한 관계·시간·이유만 AI 음성으로 이어요.',
      segments: ['bg-primary', 'bg-amber-500', 'bg-primary', 'bg-amber-500'],
      recommended: false
    },
    {
      value: 'subtitles_only',
      label: '자막 중심형',
      description: 'AI 음성 없이 원대사와 현장음을 살리고, 시간·장소·관계만 짧은 자막으로 보충해요.',
      segments: ['bg-muted-foreground/45', 'bg-muted-foreground/45', 'bg-muted-foreground/45'],
      recommended: false
    }
  ];

  const layoutPresets = [
    {
      value: 'full_bleed',
      label: '전체 화면',
      description: '영상이 화면을 꽉 채워 몰입감이 높아요. 인기 채널 대부분이 이 방식이에요.'
    },
    {
      value: 'title_band',
      label: '제목 검정 배경',
      description: '위아래를 비워 제목과 코멘트를 검은 바탕에 올려요. 글씨가 가장 잘 읽혀요.'
    }
  ];

  const voices = [
    { id: 'ko-KR-SunHiNeural', name: '선희 (몰입감 높은 스토리텔러 / 여성)', tag: '추천' },
    { id: 'ko-KR-InJoonNeural', name: '인준 (신뢰감 있는 다큐멘터리 / 남성)', tag: '인기' },
    { id: 'ko-KR-BongJinNeural', name: '봉진 (긴박한 스릴러 톤 / 남성)', tag: '스릴러' }
  ];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      onSelectVideoFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectVideoFile(e.target.files[0]);
    }
  };

  const canStart = Boolean(selectedVideoPath && rightsConfirmed && !isStarting);

  return (
    <div className="space-y-4">
      {/* 기존 진행 중 작업이 있는 경우 복구 카드 */}
      {existingJob && (
        <article className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-primary">이 작업에 저장된 설정</span>
              <h4 className="mt-0.5 truncate text-base font-bold text-foreground">
                {existingJob.source?.originalName || '진행 중인 작업'}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                분석 중 결과가 달라지지 않도록 시작할 때의 설정을 유지하고 있습니다.
              </p>
            </div>
            {onStartNewJob && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onStartNewJob}
                className="h-9 rounded-xl border-border bg-background hover:bg-muted font-bold text-xs"
              >
                새 작업 시작
              </Button>
            )}
          </div>
        </article>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* 좌측 (8칸): 01 원본 영상 선택 & 02 결과 설계 */}
        <div className="xl:col-span-8 space-y-4">
          {/* ZONE 1: 원본 영상 선택 (Pr) */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-border/60">
              <div>
                <p className="text-[11px] font-bold text-primary">01 · 작품 가져오기</p>
                <h3 className="mt-0.5 text-base font-bold text-foreground">원본 영상 선택</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  내가 보유한 풀영상 한 편만 고르면 AI가 씬 컷과 서사를 자동 분석합니다.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono bg-muted/30">
                로컬 단독 처리 · 외부 유출 0%
              </Badge>
            </div>

            {/* 드롭존 및 파일 카드 */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={cn(
                "mt-4 flex min-h-24 items-center gap-4 rounded-xl border p-4 transition-all duration-200",
                selectedVideoPath
                  ? "border-primary/30 bg-primary/[0.05] shadow-xs"
                  : "border-dashed border-border bg-muted/20 hover:bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl",
                  selectedVideoPath
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {selectedVideoPath ? <Film className="size-6" /> : <Upload className="size-6" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {selectedVideoName || '원본 영상을 드래그하여 놓거나 파일을 선택하세요'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>MP4 / MOV / MKV (최대 20GB)</span>
                  {videoInfo?.duration && (
                    <>
                      <span>·</span>
                      <span className="font-mono font-medium text-foreground">
                        {Math.floor(videoInfo.duration / 60)}분 {Math.floor(videoInfo.duration % 60)}초
                      </span>
                    </>
                  )}
                  {videoInfo?.width && videoInfo?.height && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{videoInfo.width}x{videoInfo.height}</span>
                    </>
                  )}
                </div>
              </div>

              <label className="cursor-pointer shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10 rounded-xl font-bold text-xs pointer-events-none"
                >
                  <Video className="mr-1.5 size-4 text-primary" />
                  {selectedVideoPath ? '다른 영상 선택' : '영상 파일 선택'}
                </Button>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>
          </section>

          {/* ZONE 2: 결과 설계 (Fx) */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-5">
            <div className="pb-3 border-b border-border/60">
              <p className="text-[11px] font-bold text-primary">02 · 결과 설계</p>
              <h3 className="mt-0.5 text-base font-bold text-foreground">완성 형태를 고르세요</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                필수 선택만 앞에 두고 세부 스타일은 완성 후에도 자유롭게 수정할 수 있습니다.
              </p>
            </div>

            {/* 그리드: 완성 개수 + 전달 방식 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* 완성 개수 (4칸) */}
              <div className="md:col-span-4 rounded-xl border border-border bg-muted/20 p-3.5 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-bold text-foreground block">몇 편을 만들까요?</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">1~5개 연작 쇼츠</p>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-background border border-border p-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={settings.targetShortsCount <= 1}
                    onClick={() => onSettingsChange({ targetShortsCount: settings.targetShortsCount - 1 })}
                    className="size-8 rounded-lg"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="font-mono text-base font-bold text-foreground">
                    {settings.targetShortsCount}편
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={settings.targetShortsCount >= 5}
                    onClick={() => onSettingsChange({ targetShortsCount: settings.targetShortsCount + 1 })}
                    className="size-8 rounded-lg"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* 전달 방식 (8칸) */}
              <div className="md:col-span-8 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">어떻게 전달할까요?</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        선택한 방식은 AI 대본, 원대사 유지 구간, 자막과 음성 생성 계획에 함께 적용됩니다.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {deliveryModes.map(dm => {
                    const isSel = settings.deliveryMode === dm.value;
                    return (
                      <button
                        key={dm.value}
                        type="button"
                        onClick={() => onSettingsChange({ deliveryMode: dm.value as any })}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px]",
                          isSel
                            ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary/20"
                            : "border-border bg-background hover:bg-muted/40 text-foreground"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{dm.label}</span>
                            {dm.recommended && (
                              <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">
                                추천
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {dm.description}
                          </p>
                        </div>
                        <div className="mt-2 flex h-1.5 gap-1 w-full">
                          {dm.segments.map((seg, idx) => (
                            <span key={idx} className={cn("flex-1 rounded-full", seg)} />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 화면 구성 & 서사 시리즈 모드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/60">
              {/* 화면 구성 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">화면 구성 (9:16)</label>
                <div className="grid grid-cols-2 gap-2">
                  {layoutPresets.map(lp => {
                    const isSel = settings.layoutPreset === lp.value;
                    return (
                      <button
                        key={lp.value}
                        type="button"
                        onClick={() => onSettingsChange({ layoutPreset: lp.value as any })}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5",
                          isSel
                            ? "bg-primary/10 border-primary font-bold text-primary"
                            : "border-border bg-background hover:bg-muted/40 text-foreground"
                        )}
                      >
                        <div className="h-8 w-5 rounded bg-neutral-900 border border-border shrink-0 flex flex-col justify-between overflow-hidden">
                          {lp.value === 'title_band' ? (
                            <>
                              <div className="h-1.5 w-full bg-black" />
                              <div className="flex-1 w-full bg-primary/40" />
                              <div className="h-1.5 w-full bg-black" />
                            </>
                          ) : (
                            <div className="h-full w-full bg-primary/40" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs block truncate">{lp.label}</span>
                          <span className="text-[9px] text-muted-foreground font-normal truncate block">
                            {lp.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI 음성 보이스 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">AI 내레이션 음성 (Edge-TTS)</label>
                <select
                  value={settings.voiceId}
                  onChange={e => onSettingsChange({ voiceId: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground cursor-pointer focus:ring-1 focus:ring-primary"
                >
                  {voices.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="series-mode-check"
                    checked={settings.seriesMode}
                    onChange={e => onSettingsChange({ seriesMode: e.target.checked })}
                    className="size-3.5 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="series-mode-check" className="text-xs text-foreground font-medium cursor-pointer">
                    이어지는 시리즈 연작으로 구성 (제1부 ➔ 제2부 ➔ 제3부)
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 우측 (4칸): 03 제작 요약 브리프 & 발주 패널 (Fo) */}
        <aside className="xl:col-span-4 sticky top-4">
          <div className="relative overflow-hidden rounded-2xl bg-neutral-950 p-5 text-white shadow-xl border border-neutral-800">
            {/* 배경 블러 효과 */}
            <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-primary/25 blur-3xl" />

            <div>
              <p className="text-xs font-bold text-blue-300">03 · 제작 요약 브리프</p>
              <h3 className="mt-0.5 text-base font-bold text-white">이 설정으로 분석을 시작할게요</h3>
            </div>

            {/* 선택 정보 서머리 */}
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white/[0.08] p-3 backdrop-blur-sm">
                <p className="text-[11px] text-white/60">선택 원본</p>
                <p className="mt-0.5 truncate text-xs font-bold text-white">
                  {selectedVideoName || '아직 선택하지 않았어요'}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.06] p-2.5">
                  <dt className="text-[10px] text-white/60">쇼츠 편수</dt>
                  <dd className="mt-0.5 font-bold font-mono text-white text-sm">
                    {settings.targetShortsCount}편 연작
                  </dd>
                </div>
                <div className="rounded-lg bg-white/[0.06] p-2.5">
                  <dt className="text-[10px] text-white/60">화면 비율</dt>
                  <dd className="mt-0.5 font-bold text-white text-xs truncate">
                    {settings.layoutPreset === 'full_bleed' ? '전체 화면' : '제목 검정 배경'}
                  </dd>
                </div>
                <div className="col-span-2 rounded-lg bg-white/[0.06] p-2.5">
                  <dt className="text-[10px] text-white/60">전달 방식</dt>
                  <dd className="mt-0.5 font-bold text-white text-xs">
                    {deliveryModes.find(d => d.value === settings.deliveryMode)?.label}
                  </dd>
                </div>
              </dl>

              {/* 4단계 서사 파이프라인 안내 */}
              <div className="rounded-xl bg-white/[0.07] px-3 py-2 text-center text-xs font-medium text-white/80">
                도입(훅) ➔ 전개 ➔ 위기 ➔ 결말(반전)
              </div>
            </div>

            {/* 권리 확인 체크박스 */}
            <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.06] p-3">
                <input
                  type="checkbox"
                  id="rights-confirmed-check"
                  checked={rightsConfirmed}
                  onChange={e => onRightsConfirmedChange(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="rights-confirmed-check" className="text-xs text-white/80 leading-relaxed cursor-pointer flex-1">
                  선택한 영상의 2차 편집 및 쇼츠 제작 권리가 있음을 확인합니다.
                </label>
              </div>

              {/* CTA 시작 버튼 */}
              <Button
                type="button"
                disabled={!canStart}
                onClick={onStartAnalysis}
                className="w-full h-11 rounded-xl bg-white text-neutral-950 hover:bg-white/90 font-black text-xs shadow-lg transition-transform duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isStarting ? (
                  <span>분석 작업 준비 중...</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="size-4 text-primary" />
                    <span>영화·드라마 씬 감지 & AI 분석 시작</span>
                    <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
