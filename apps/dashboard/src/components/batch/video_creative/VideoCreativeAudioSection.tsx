import React, { useState, useRef } from 'react';
import { Volume2, Mic, Upload, Sparkles, CheckCircle2, Play, Square, Loader2, Music, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import TTSConfigPanel from '@/components/shared/TTSConfigPanel';
import { TTSConfig } from '@/types/tts';
import { AudioMode, AudioSourceDraft, AudioSourceData } from './videoCreativeTypes';

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  engine: 'supertone-local',
  language: 'ko',
  voice_id: 'F1',
  speed: 1.0,
  pitch: 0,
  use_silence_removal: true,
};

interface VideoCreativeAudioSectionProps {
  script: string;
  audioMode: AudioMode;
  onAudioModeChange: (mode: AudioMode) => void;
  ttsConfig: TTSConfig;
  onTTSConfigChange: (config: TTSConfig) => void;
  audioSourceDraft: AudioSourceDraft;
  onAudioDraftChange: (draft: AudioSourceDraft) => void;
  onScriptExtractedFromAudio?: (script: string) => void;
}

export const VideoCreativeAudioSection: React.FC<VideoCreativeAudioSectionProps> = ({
  script,
  audioMode,
  onAudioModeChange,
  ttsConfig,
  onTTSConfigChange,
  audioSourceDraft,
  onAudioDraftChange,
  onScriptExtractedFromAudio,
}) => {
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [isExtractingSTT, setIsExtractingSTT] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. AI TTS 음성 생성 및 Whisper 타임스탬프 추출
  const handleGenerateTTS = async () => {
    if (!script.trim()) {
      toast.error('음성을 생성할 대본 텍스트를 먼저 입력하세요.');
      return;
    }

    try {
      setIsGeneratingTTS(true);
      const res = await fetch('/api/video-creative/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script.trim(),
          engine: ttsConfig.engine,
          language: ttsConfig.language,
          voice_id: ttsConfig.voice_id,
          rate: Math.round((ttsConfig.speed - 1.0) * 100),
          pitch: ttsConfig.pitch,
          emotion: ttsConfig.emotion || 'normal',
          silence_enabled: ttsConfig.use_silence_removal || false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'TTS 생성 실패');
      }

      const data = await res.json();
      const audioSource: AudioSourceData = {
        filename: data.filename,
        path: data.audioPath,
        durationMs: data.durationMs,
        transcript: data.transcript,
        timedSegments: data.segments?.map((seg: any, idx: number) => ({
          id: idx + 1,
          text: seg.text,
          startMs: seg.startMs,
          endMs: seg.endMs,
          durationMs: seg.durationMs,
        })) || [],
      };

      onAudioDraftChange({
        status: 'ready',
        fileName: data.filename,
        source: audioSource,
      });

      toast.success(`TTS 음성 생성 완료! (${(data.durationMs / 1000).toFixed(1)}초, ${audioSource.timedSegments.length}개 자막 세그먼트)`);
    } catch (err: any) {
      toast.error(`TTS 음성 생성 실패: ${err.message}`);
      onAudioDraftChange({
        status: 'error',
        error: err.message,
      });
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // 2. MP3 업로드 및 STT 전사
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExtractingSTT(true);
      onAudioDraftChange({
        status: 'loading',
        fileName: file.name,
      });

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', 'ko');

      const res = await fetch('/api/video-creative/stt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'STT 전사 실패');
      }

      const data = await res.json();
      const audioSource: AudioSourceData = {
        filename: data.audioSource?.filename || file.name,
        path: data.audioSource?.path,
        durationMs: data.audioSource?.durationMs || 15000,
        transcript: data.transcript || '',
        timedSegments: data.audioSource?.timedSegments || [],
      };

      onAudioDraftChange({
        status: 'ready',
        fileName: file.name,
        source: audioSource,
      });

      if (data.transcript && onScriptExtractedFromAudio) {
        onScriptExtractedFromAudio(data.transcript);
        toast.info('추출된 대본이 폼에 자동 입력되었습니다.');
      }

      toast.success(`오디오 전사 완료! (${(audioSource.durationMs / 1000).toFixed(1)}초)`);
    } catch (err: any) {
      toast.error(`오디오 STT 실패: ${err.message}`);
      onAudioDraftChange({
        status: 'error',
        error: err.message,
      });
    } finally {
      setIsExtractingSTT(false);
      e.target.value = '';
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current && audioSourceDraft.source?.path) {
      // Create audio element
      const audioUrl = `/api/files/stream?path=${encodeURIComponent(audioSourceDraft.source.path)}`;
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
      audioRef.current.onerror = () => {
        setIsPlayingAudio(false);
        toast.error('오디오 재생 실패');
      };
    }

    if (isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current?.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const clearAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    onAudioDraftChange({ status: 'idle' });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-foreground">오디오 및 보이스 소스</span>
            <p className="text-[11px] text-muted-foreground">대본 낭독 TTS 음성 또는 소장 중인 오디오 파일</p>
          </div>
        </div>

        <div className="flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAudioModeChange('tts')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
              audioMode === 'tts'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            AI TTS 음성
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAudioModeChange('mp3')}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
              audioMode === 'mp3'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="h-3 w-3 mr-1.5" />
            오디오 업로드 (STT)
          </Button>
        </div>
      </div>

      {/* MODE A: AI TTS */}
      {audioMode === 'tts' && (
        <div className="space-y-3">
          <TTSConfigPanel
            config={ttsConfig}
            onChange={onTTSConfigChange}
            compact={true}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>선택 엔진:</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {ttsConfig.engine}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {ttsConfig.voice_id}
              </Badge>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleGenerateTTS}
              disabled={isGeneratingTTS || !script.trim()}
              className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGeneratingTTS ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  음성 생성 및 전사 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  ⚡ 음성 미리듣기 / 타임스탬프 추출
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* MODE B: MP3 STT */}
      {audioMode === 'mp3' && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg"
            className="hidden"
            onChange={handleAudioUpload}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-background/50 p-6 text-center hover:border-primary/60 hover:bg-accent/20 cursor-pointer transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">
              오디오 파일(MP3, WAV, M4A)을 클릭하여 선택하세요
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              로컬 Faster-Whisper가 음성을 전사하고 자막 타임코드를 자동 생성합니다
            </p>
          </div>
        </div>
      )}

      {/* Ready Audio Status Bar */}
      {audioSourceDraft.status === 'ready' && audioSourceDraft.source && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Music className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground truncate max-w-[200px]" title={audioSourceDraft.fileName}>
                  {audioSourceDraft.fileName}
                </span>
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
                  준비 완료
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                <span>{(audioSourceDraft.source.durationMs / 1000).toFixed(1)}초</span>
                <span>·</span>
                <span>{audioSourceDraft.source.timedSegments.length}개 씬 동기화</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePlayAudio}
              className="h-7 px-2.5 text-xs gap-1 border-border/80"
            >
              {isPlayingAudio ? (
                <>
                  <Square className="h-3 w-3 fill-current" />
                  정지
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" />
                  재생
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAudio}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              초기화
            </Button>
          </div>
        </div>
      )}

      {audioSourceDraft.status === 'loading' && (
        <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>오디오 음성을 처리하고 Whisper 자막을 추출하는 중...</span>
        </div>
      )}

      {audioSourceDraft.status === 'error' && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">{audioSourceDraft.error || '오디오 처리 중 오류가 발생했습니다.'}</span>
        </div>
      )}
    </div>
  );
};
