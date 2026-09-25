import React, { useState, useEffect, useRef } from 'react';
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
  Video,
  Loader2,
  Check,
  User,
  Mic2
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

export interface VoiceOption {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  category?: string;
  tag?: string;
  description?: string;
  engine?: string;
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
  isUploadingSource?: boolean;
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
  onStartNewJob,
  isUploadingSource = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [voices, setVoices] = useState<VoiceOption[]>([
    { id: 'F1', name: '서연', gender: 'female', category: '스토리텔러', tag: '추천 1위', description: '몰입감 높은 여성 표준 스토리텔러, 감정 전달력 최상' },
    { id: 'M1', name: '민준', gender: 'male', category: '속보·풍자', tag: '인기', description: '신뢰감 있는 남성 표준 & 속보·풍자 최적화' },
    { id: 'M2', name: '도현', gender: 'male', category: '다큐멘터리', tag: '지적', description: '차분하고 지적인 중저음 톤, 미스터리 분석' },
    { id: 'F2', name: '지우', gender: 'female', category: '자연스러움', tag: '밝음', description: '청년 여성의 밝고 경쾌한 스토리텔링' },
    { id: 'F3', name: '수진', gender: 'female', category: '감성 다큐', tag: '차분함', description: '차분하고 섬세한 감정선의 리뷰 내레이션' },
    { id: 'M4', name: '영호', gender: 'male', category: '중후함', tag: '중후함', description: '깊은 울림과 호소력 있는 중년 남성 내레이션' }
  ]);

  // 백엔드 음성 카탈로그 동적 로드
  useEffect(() => {
    let isMounted = true;
    const loadVoices = async () => {
      try {
        const resp = await fetch('/api/ve/movie-drama-shorts/voices');
        if (resp.ok) {
          const list: VoiceOption[] = await resp.json();
          if (isMounted && Array.isArray(list) && list.length > 0) {
            setVoices(list);
          }
        }
      } catch (_) {
        // 기본 보이스 목록 fallback 유지
      }
    };
    loadVoices();
    return () => {
      isMounted = false;
    };
  }, []);

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
      label: '전체 화면 (9:16)',
      description: '영상이 화면을 꽉 채워 몰입감이 높아요. 인기 채널 대부분이 이 방식이에요.'
    },
    {
      value: 'title_band',
      label: '제목 검정 배경 (레터박스)',
      description: '위아래를 비워 제목과 코멘트를 검은 바탕에 올려요. 글씨가 가장 잘 읽혀요.'
    }
  ];

  // 숨겨진 파일 인풋 또는 Electron 네이티브 다이얼로그 트리거
  const handleTriggerFileSelect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const electronApi = (window as any).electronAPI;
    if (electronApi && typeof electronApi.selectVideoFile === 'function') {
      try {
        const res = await electronApi.selectVideoFile();
        if (res && res.success && res.path) {
          const fileName = res.path.split(/[\\/]/).pop();
          if (onSelectVideoPath) {
            onSelectVideoPath(res.path, fileName);
          } else {
            onSelectVideoFile({ name: fileName, path: res.path } as any);
          }
          return;
        }
      } catch (err) {
        console.warn('[MovieDrama] Electron selectVideoFile error, falling back to input:', err);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const electronApi = (window as any).electronAPI;
      const localPath = electronApi?.getPathForFile?.(file) || (file as any).path;
      if (localPath && typeof localPath === 'string' && !localPath.includes('fakepath') && onSelectVideoPath) {
        onSelectVideoPath(localPath, file.name);
      } else {
        onSelectVideoFile(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectVideoFile(e.target.files[0]);
    }
  };

  const canStart = Boolean(selectedVideoPath && rightsConfirmed && !isStarting && !isUploadingSource);

  const selectedVoice = voices.find(v => v.id === settings.voiceId) || voices[0];

  return (
    <div className="space-y-4">
      {/* 숨겨진 파일 선택 Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,.mp4,.mov,.mkv,.avi,.webm"
        disabled={isUploadingSource}
        onChange={handleFileInputChange}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        className="hidden"
      />

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
                className="h-9 rounded-xl border-border bg-background hover:bg-muted font-bold text-xs cursor-pointer shadow-xs"
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => handleTriggerFileSelect()}
              className={cn(
                "mt-4 flex min-h-24 items-center gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer select-none",
                isDraggingOver
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md scale-[1.005]"
                  : selectedVideoPath
                  ? "border-primary/30 bg-primary/[0.05] hover:bg-primary/[0.08] shadow-xs"
                  : "border-dashed border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                  selectedVideoPath
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {selectedVideoPath ? <Film className="size-6" /> : <Upload className="size-6" />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {selectedVideoName || '원본 영상을 드래그하여 놓거나 여기를 클릭하여 선택하세요'}
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

              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isUploadingSource}
                  onClick={(e) => handleTriggerFileSelect(e)}
                  className="h-10 rounded-xl font-bold text-xs cursor-pointer shadow-xs hover:bg-secondary/80"
                >
                  {isUploadingSource ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin text-primary" />
                      <span>저장소 등록 중...</span>
                    </>
                  ) : (
                    <>
                      <Video className="mr-1.5 size-4 text-primary" />
                      <span>{selectedVideoPath ? '다른 영상 선택' : '영상 파일 선택'}</span>
                    </>
                  )}
                </Button>
              </div>
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
                  <p className="text-[11px] text-muted-foreground mt-0.5">1~5개 킬러 쇼츠 시리즈</p>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-background border border-border p-1.5 shadow-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={settings.targetShortsCount <= 1}
                    onClick={() => onSettingsChange({ targetShortsCount: Math.max(1, settings.targetShortsCount - 1) })}
                    className="size-8 rounded-lg cursor-pointer hover:bg-muted"
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
                    onClick={() => onSettingsChange({ targetShortsCount: Math.min(5, settings.targetShortsCount + 1) })}
                    className="size-8 rounded-lg cursor-pointer hover:bg-muted"
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

            {/* 화면 구성 & AI 내레이션 보이스 */}
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
                            ? "bg-primary/10 border-primary font-bold text-primary ring-1 ring-primary/20 shadow-xs"
                            : "border-border bg-background hover:bg-muted/40 text-foreground"
                        )}
                      >
                        <div className="h-8 w-5 rounded bg-muted dark:bg-neutral-900 border border-border shrink-0 flex flex-col justify-between overflow-hidden">
                          {lp.value === 'title_band' ? (
                            <>
                              <div className="h-1.5 w-full bg-foreground/70" />
                              <div className="flex-1 w-full bg-primary/40" />
                              <div className="h-1.5 w-full bg-foreground/70" />
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

                <div className="flex items-center gap-2 pt-2">
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

              {/* AI 음성 보이스 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Mic2 className="size-3.5 text-primary" />
                    <span>AI 내레이션 음성</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {voices.length}개 프리미엄 음성
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={settings.voiceId}
                    onChange={e => onSettingsChange({ voiceId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground cursor-pointer focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.category ? `${v.category} / ` : ''}{v.gender === 'female' ? '여성' : '남성'}{v.tag ? ` - ${v.tag}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 선택된 음성 설명 카드 */}
                {selectedVoice && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-2.5 flex items-start gap-2 text-xs">
                    <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground text-xs">{selectedVoice.name}</span>
                        {selectedVoice.tag && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                            {selectedVoice.tag}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {selectedVoice.gender === 'female' ? '여성' : '남성'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                        {selectedVoice.description || '영화·드라마 긴장감 전달에 최적화된 목소리'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* 우측 (4칸): 03 제작 요약 브리프 & 발주 패널 (Fo) */}
        <aside className="xl:col-span-4 sticky top-4">
          <div className="relative overflow-hidden rounded-2xl bg-card p-5 text-card-foreground shadow-xs border border-border">
            {/* 배경 블러 효과 */}
            <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-primary/10 blur-3xl" />

            <div>
              <p className="text-xs font-bold text-primary">03 · 제작 요약 브리프</p>
              <h3 className="mt-0.5 text-base font-bold text-foreground">이 설정으로 분석을 시작할게요</h3>
            </div>

            {/* 선택 정보 서머리 */}
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-muted/40 border border-border/60 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-muted-foreground">선택 원본</p>
                <p className="mt-0.5 truncate text-xs font-bold text-foreground">
                  {selectedVideoName || '아직 선택하지 않았어요'}
                </p>
                {videoInfo?.duration && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                    러닝타임: {Math.floor(videoInfo.duration / 60)}분 {Math.floor(videoInfo.duration % 60)}초
                  </p>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                  <dt className="text-[10px] text-muted-foreground">쇼츠 편수</dt>
                  <dd className="mt-0.5 font-bold font-mono text-foreground text-sm">
                    {settings.targetShortsCount}편 {settings.seriesMode ? '연작' : '단편'}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                  <dt className="text-[10px] text-muted-foreground">화면 비율</dt>
                  <dd className="mt-0.5 font-bold text-foreground text-xs truncate">
                    {settings.layoutPreset === 'full_bleed' ? '전체 화면 (9:16)' : '제목 검정 배경'}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                  <dt className="text-[10px] text-muted-foreground">전달 방식</dt>
                  <dd className="mt-0.5 font-bold text-foreground text-xs truncate">
                    {deliveryModes.find(d => d.value === settings.deliveryMode)?.label}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/40 p-2.5">
                  <dt className="text-[10px] text-muted-foreground">선택된 목소리</dt>
                  <dd className="mt-0.5 font-bold text-foreground text-xs truncate">
                    {selectedVoice.name}
                  </dd>
                </div>
              </dl>

              {/* 4단계 서사 파이프라인 안내 */}
              <div className="rounded-xl bg-muted/30 border border-border/40 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                도입(훅) ➔ 전개 ➔ 위기 ➔ 결말(반전)
              </div>
            </div>

            {/* 권리 확인 체크박스 */}
            <div className="mt-4 pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/30 border border-border/40 p-3">
                <input
                  type="checkbox"
                  id="rights-confirmed-check"
                  checked={rightsConfirmed}
                  onChange={e => onRightsConfirmedChange(e.target.checked)}
                  className="mt-0.5 size-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="rights-confirmed-check" className="text-xs text-foreground/80 leading-relaxed cursor-pointer flex-1">
                  선택한 영상의 2차 편집 및 쇼츠 제작 권리가 있음을 확인합니다.
                </label>
              </div>

              {/* CTA 시작 버튼 */}
              <Button
                type="button"
                disabled={!canStart}
                onClick={onStartAnalysis}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs shadow-md transition-transform duration-200 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isStarting ? (
                  <span>분석 작업 준비 중...</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="size-4 text-primary-foreground" />
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
