import React, { useState, useRef } from 'react';
import {
  FileText,
  Music,
  Globe,
  Tv,
  Layers,
  Sparkles,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  CheckCircle2,
  HelpCircle,
  X,
  Clock,
  Coins,
  AlertTriangle,
  Info,
  Zap,
  Film,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SURFACES,
  DEFAULT_LANGUAGES,
  MAX_JOB_COUNT,
  MAX_TARGET_SOURCES,
  FramingMode,
  SubtitlePreset,
  SUBTITLE_PRESETS,
  AudioSourceDraft,
  AudioMode,
  LocalVideoFile,
  formatDurationSeconds,
} from './videoCreativeTypes';
import { TTSConfig } from '@/types/tts';
import { VideoDropZone } from './VideoDropZone';
import { VideoLibraryModal } from './VideoLibraryModal';
import { VideoCreativeAudioSection } from './VideoCreativeAudioSection';

interface VideoCreativeFormProps {
  titleDraft: string;
  setTitleDraft: (val: string) => void;
  scriptDraft: string;
  setScriptDraft: (val: string) => void;
  candidateUrlDraft: string;
  setCandidateUrlDraft: (val: string) => void;
  candidateUrls: string[];
  localVideoFiles: LocalVideoFile[];
  setLocalVideoFiles: (files: LocalVideoFile[]) => void;
  selectedSurfaces: string[];
  toggleSurface: (surface: string) => void;
  selectedLanguages: string[];
  toggleLanguage: (lang: string) => void;
  customLanguageDraft: string;
  setCustomLanguageDraft: (val: string) => void;
  customLanguages: string[];
  onAddCustomLanguage: () => void;
  onRemoveCustomLanguage: (lang: string) => void;
  jobCountDraft: number;
  setJobCountDraft: (val: number) => void;
  targetSourceCountDraft: number;
  setTargetSourceCountDraft: (val: number) => void;
  framingModeDraft: FramingMode;
  setFramingModeDraft: (val: FramingMode) => void;
  subtitlePresetDraft: SubtitlePreset;
  setSubtitlePresetDraft: (val: SubtitlePreset) => void;
  audioMode: AudioMode;
  setAudioMode: (mode: AudioMode) => void;
  ttsConfig: TTSConfig;
  setTTSConfig: (config: TTSConfig) => void;
  audioDraft: AudioSourceDraft;
  onAudioDraftChange: (draft: AudioSourceDraft) => void;
  onSelectAudioFile: (file: File) => void;
  onClearAudio: () => void;
  onRewriteScript: () => void;
  rewritingScript: boolean;
  canAddJobs: boolean;
  onAddJobs: () => void;
  queueRunning: boolean;
  canStartQueue: boolean;
  canPauseQueue: boolean;
  hasPausedRunningJobs: boolean;
  hasQueuedJobs?: boolean;
  queuedCount?: number;
  onInstantStart?: () => void;
  onLoadSampleScript?: () => void;
  onStartQueue: () => void;
  onPauseQueue: () => void;
  onResetQueue: () => void;
  estimatedCredits: number;
  estimatedSeconds: number;
}

export const VideoCreativeForm: React.FC<VideoCreativeFormProps> = ({
  titleDraft,
  setTitleDraft,
  scriptDraft,
  setScriptDraft,
  candidateUrlDraft,
  setCandidateUrlDraft,
  candidateUrls,
  localVideoFiles,
  setLocalVideoFiles,
  selectedSurfaces,
  toggleSurface,
  selectedLanguages,
  toggleLanguage,
  customLanguageDraft,
  setCustomLanguageDraft,
  customLanguages,
  onAddCustomLanguage,
  onRemoveCustomLanguage,
  jobCountDraft,
  setJobCountDraft,
  targetSourceCountDraft,
  setTargetSourceCountDraft,
  framingModeDraft,
  setFramingModeDraft,
  subtitlePresetDraft,
  setSubtitlePresetDraft,
  audioMode,
  setAudioMode,
  ttsConfig,
  setTTSConfig,
  audioDraft,
  onAudioDraftChange,
  onSelectAudioFile,
  onClearAudio,
  onRewriteScript,
  rewritingScript,
  canAddJobs,
  onAddJobs,
  queueRunning,
  canStartQueue,
  canPauseQueue,
  hasPausedRunningJobs,
  hasQueuedJobs = false,
  queuedCount = 0,
  onInstantStart,
  onLoadSampleScript,
  onStartQueue,
  onPauseQueue,
  onResetQueue,
  estimatedCredits,
  estimatedSeconds,
}) => {
  const [videoSourceTab, setVideoSourceTab] = useState<'local' | 'urls'>('local');
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
      {/* 로컬 미디어 보관함 선택 모달 */}
      <VideoLibraryModal
        open={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        alreadySelectedFiles={localVideoFiles}
        onSelectVideos={(selected) => {
          // Merge without duplicate IDs
          const existingMap = new Map(localVideoFiles.map(f => [f.filePath, f]));
          selected.forEach(s => existingMap.set(s.filePath, s));
          setLocalVideoFiles(Array.from(existingMap.values()));
        }}
      />

      {/* 민감 기기/로그인 제한 안내 배너 */}
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0 text-amber-500" />
        <span>
          IP·기기 정보 등 민감한 사항으로 로그인이 제한되신다면, 별도로 다운로드한 로컬 영상 파일로 작업을 진행해 주세요.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1. 작업명 (제목) */}
        <div className="space-y-1.5 lg:col-span-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="video-creative-title" className="text-xs font-bold text-foreground">
              작업명
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border text-popover-foreground text-xs">
                  제목을 비워두면 대본 첫 줄로 자동 생성
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="video-creative-title"
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            placeholder="제목을 비워두면 대본 첫 줄로 자동 생성"
            data-pixi-video-creative-title="true"
            className="text-xs font-semibold bg-background border-border text-foreground"
          />
        </div>

        {/* 2. 대본 에디터 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="video-creative-script" className="text-xs font-bold text-foreground flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                대본
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                    입력한 대본을 문장 단위로 나눠 검색어를 만들고, 다운로드된 원본을 CapCut 미디어에 남기는 흐름입니다.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{scriptDraft.length}자</span>
              {onLoadSampleScript && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onLoadSampleScript}
                  className="h-6 px-2 text-[10px] gap-1 font-bold border-border text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>예시 대본</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRewriteScript}
                disabled={rewritingScript || !scriptDraft.trim()}
                className="h-6 px-2 text-[10px] gap-1 font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
              >
                {rewritingScript ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Sparkles className="w-2.5 h-2.5" />
                )}
                <span>AI 후킹 강화</span>
              </Button>
            </div>
          </div>
          <Textarea
            id="video-creative-script"
            value={scriptDraft}
            onChange={e => setScriptDraft(e.target.value)}
            placeholder="대본을 직접 입력하거나 아래 오디오 섹션에서 TTS를 생성하거나 MP3를 업로드하세요."
            data-pixi-video-creative-script="true"
            className="min-h-48 resize-y text-xs leading-relaxed bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/25"
          />
        </div>

        {/* 3. 비디오 소스 (드래그앤드롭 / 07_Downloads 보관함 / 후보 URL) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                <Film className="w-3.5 h-3.5 text-primary" />
                비디오 클립 소스
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                    직접 영상을 끌어다 놓거나 보관함에서 선택할 수 있습니다. URL을 직접 입력할 수도 있으며, 비워두면 대본 기반으로 최적 영상을 자동 검색/다운로드합니다.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Source Mode Switcher */}
            <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5">
              <button
                type="button"
                onClick={() => setVideoSourceTab('local')}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                  videoSourceTab === 'local'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                로컬 파일 ({localVideoFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setVideoSourceTab('urls')}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                  videoSourceTab === 'urls'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                후보 URL ({candidateUrls.length})
              </button>
            </div>
          </div>

          {videoSourceTab === 'local' ? (
            <VideoDropZone
              files={localVideoFiles}
              onFilesChange={setLocalVideoFiles}
              onOpenLibraryModal={() => setIsLibraryModalOpen(true)}
              maxFiles={targetSourceCountDraft}
            />
          ) : (
            <div className="space-y-1.5">
              <Textarea
                id="video-creative-candidate-urls"
                value={candidateUrlDraft}
                onChange={e => setCandidateUrlDraft(e.target.value)}
                placeholder="비워두면 선택한 채널/언어로 자동 검색합니다. 직접 넣을 때는 YouTube Shorts, Instagram Reels, TikTok URL을 줄바꿈으로 입력"
                data-pixi-video-creative-candidate-urls="true"
                className="min-h-48 resize-y text-xs leading-relaxed bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/25"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>직접 감지된 URL {candidateUrls.length}개</span>
                <span>작업당 최대 {targetSourceCountDraft}개 다운로드</span>
              </div>
            </div>
          )}
        </div>

        {/* 4. 오디오 및 보이스 섹션 (AI TTS & MP3 STT) */}
        <div className="lg:col-span-2">
          <VideoCreativeAudioSection
            script={scriptDraft}
            audioMode={audioMode}
            onAudioModeChange={setAudioMode}
            ttsConfig={ttsConfig}
            onTTSConfigChange={setTTSConfig}
            audioSourceDraft={audioDraft}
            onAudioDraftChange={onAudioDraftChange}
            onScriptExtractedFromAudio={(extractedText) => {
              if (!scriptDraft.trim()) {
                setScriptDraft(extractedText);
              }
            }}
          />
        </div>

        {/* 5. 검색 채널 (Surfaces) */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-primary" />
            <Label className="text-xs font-bold text-foreground">검색 채널</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                  채널별 후보 링크를 Pix 다운로드 큐에 넣고, 실패한 링크는 다음 후보로 넘기는 방식으로 연결됩니다.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SURFACES.map(s => {
              const active = selectedSurfaces.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSurface(s.value)}
                  data-pixi-video-creative-surface={s.value}
                  className={`h-9 rounded-lg border px-2 font-bold text-xs transition cursor-pointer ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. 검색 언어 (Languages) */}
        <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <Label className="text-xs font-bold text-foreground">검색 언어</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                  선택한 언어별로 키워드를 확장하고, 기타 언어는 여러 개 추가할 수 있습니다.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_LANGUAGES.map(l => {
              const active = selectedLanguages.includes(l.value);
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => toggleLanguage(l.value)}
                  data-pixi-video-creative-language={l.value}
                  className={`h-9 rounded-lg border px-2 font-bold text-xs transition cursor-pointer ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>

          {/* 기타 언어 직접 입력 */}
          <div className="pt-1.5 space-y-1.5">
            <Label htmlFor="video-creative-custom-language" className="text-muted-foreground text-xs">
              기타(직접입력)
            </Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                id="video-creative-custom-language"
                value={customLanguageDraft}
                onChange={e => setCustomLanguageDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddCustomLanguage();
                  }
                }}
                data-pixi-video-creative-custom-language="true"
                placeholder="기타 언어 직접입력"
                className="h-9 text-xs bg-background border-border text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddCustomLanguage}
                disabled={!customLanguageDraft.trim()}
                data-pixi-video-creative-add-custom-language="true"
                className="h-9 gap-1 px-3 text-xs border-border shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>언어</span>
              </Button>
            </div>

            {customLanguages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customLanguages.map(lang => (
                  <span
                    key={lang}
                    className="inline-flex h-7 items-center rounded-full border border-border bg-muted/40 px-2.5 font-medium text-muted-foreground text-xs hover:text-foreground"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCustomLanguage(lang)}
                      className="ml-1.5 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      삭제
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 7. 생성 규격 (생성 개수, 원본 수, 화면 구성) */}
        <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-3 lg:col-span-2">
          {/* 생성 개수 */}
          <div className="space-y-1.5">
            <Label htmlFor="video-creative-count" className="text-xs font-bold text-foreground">
              생성 개수
            </Label>
            <Input
              id="video-creative-count"
              type="number"
              min={1}
              max={MAX_JOB_COUNT}
              value={jobCountDraft}
              onChange={e => setJobCountDraft(Math.max(1, Math.min(MAX_JOB_COUNT, Number(e.target.value) || 1)))}
              data-pixi-video-creative-count="true"
              className="h-9 text-xs font-mono font-bold bg-background border-border text-foreground"
            />
          </div>

          {/* 원본 영상 수 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="video-creative-target-sources" className="text-xs font-bold text-foreground">
                원본 영상 수
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover border-border text-popover-foreground text-xs">
                    작업 하나당 자동 검색 후 다운로드해서 CapCut 초안에 넣을 최대 원본 영상 개수입니다.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="video-creative-target-sources"
              type="number"
              min={1}
              max={MAX_TARGET_SOURCES}
              value={targetSourceCountDraft}
              onChange={e => setTargetSourceCountDraft(Math.max(1, Math.min(MAX_TARGET_SOURCES, Number(e.target.value) || 1)))}
              data-pixi-video-creative-target-sources="true"
              className="h-9 text-xs font-mono font-bold bg-background border-border text-foreground"
            />
          </div>

          {/* 화면 구성 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-bold text-foreground">화면 구성</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                    장면 전체 보존은 가로 영상의 손동작과 사물을 자르지 않습니다. 꽉 채우기는 세로 화면을 채우지만 좌우가 잘릴 수 있습니다.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setFramingModeDraft('scene-preserve')}
                data-pixi-video-creative-framing="scene-preserve"
                className={`h-9 rounded-lg border px-1 text-xs font-bold transition cursor-pointer ${
                  framingModeDraft === 'scene-preserve' || framingModeDraft === 'fit'
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                장면 전체 보존 · 추천
              </button>
              <button
                type="button"
                onClick={() => setFramingModeDraft('fill')}
                data-pixi-video-creative-framing="fill"
                className={`h-9 rounded-lg border px-1 text-xs font-bold transition cursor-pointer ${
                  framingModeDraft === 'fill'
                    ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                세로 꽉 채우기 (크롭)
              </button>
            </div>
          </div>
        </div>

        {/* 8. CapCut 자막 스타일 프리셋 */}
        <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-3 lg:col-span-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <Label className="text-xs font-bold text-foreground">CapCut 자막 스타일 프리셋</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs">
                  CapCut 초안 생성 시 자막의 텍스트 색상, 외곽선(Stroke) 굵기 및 시인성 스타일을 지정합니다.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUBTITLE_PRESETS.map(p => {
              const active = subtitlePresetDraft === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setSubtitlePresetDraft(p.value)}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition cursor-pointer ${
                    active
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-background hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-foreground">{p.label}</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 9. 작업 등록 및 즉시 시작 액션 컨트롤 바 */}
        <div className="rounded-xl border border-border bg-card p-3.5 lg:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            {canAddJobs ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                대본 준비 완료 ({scriptDraft.trim().length}자) · {jobCountDraft}개 생성 가능
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                대본을 입력하거나 MP3 음성을 선택하면 생성이 활성화됩니다.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={!canAddJobs}
              onClick={onAddJobs}
              data-pixi-video-creative-add="true"
              className="flex-1 sm:flex-none h-9 gap-1.5 text-xs font-bold border-border hover:bg-muted cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>대기열에 담기</span>
            </Button>

            <Button
              type="button"
              disabled={!canAddJobs}
              onClick={onInstantStart || onStartQueue}
              data-pixi-video-creative-instant="true"
              className="flex-1 sm:flex-none h-9 gap-1.5 text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-current text-yellow-200" />
              <span>⚡ 추가 후 즉시 시작</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 하단 큐 제어 & 예상 지표 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            예상 크레딧/개: <strong className="text-foreground">{estimatedCredits}</strong>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            예상 시간/개: <strong className="text-foreground">{formatDurationSeconds(estimatedSeconds)}</strong>
          </span>
          {hasQueuedJobs && queuedCount > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                대기 중: {queuedCount}개
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {queueRunning ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPauseQueue}
              data-pixi-video-creative-pause="true"
              className="h-8 gap-1.5 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>큐 진행 멈춤</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={!canStartQueue}
              onClick={onStartQueue}
              data-pixi-video-creative-start="true"
              className={`h-8 gap-1.5 text-xs font-bold shadow-xs cursor-pointer ${
                hasQueuedJobs
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
              }`}
            >
              {hasPausedRunningJobs ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>큐 재개</span>
                </>
              ) : hasQueuedJobs ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>대기열 일괄 시작 ({queuedCount}개)</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current text-yellow-200" />
                  <span>⚡ 1-클릭 즉시 생성 시작</span>
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onResetQueue}
            data-pixi-video-creative-reset="true"
            className="h-8 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            <span>큐 비우기</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
