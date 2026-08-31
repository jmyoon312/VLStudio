import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Sparkles, Video, Film, Scissors, Maximize2, X, Play, Pause, RotateCcw } from 'lucide-react';
import AudioTimeline from '@/features/flow2capcut/components/AudioTimeline/AudioTimeline';
import PreviewPanel from '@/features/flow2capcut/components/AudioTimeline/PreviewPanel';
import { CapCutStudioWorkspace } from './CapCutStudioWorkspace';
import { WatermarkConfig } from './WatermarkSettingsDialog';
import { TransitionConfig } from './TransitionSettingsDialog';

export interface SceneItem {
  id: string;
  scene_id: number;
  script: string;
  visual_prompt: string;
  video_prompt?: string;
  media_url?: string;
  media_path?: string;
  audio_url?: string;
  audio_path?: string;
  video_url?: string;
  video_path?: string;
  duration?: number;
  visualStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  audioStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  renderStatus?: 'idle' | 'rendering' | 'completed' | 'failed';
  viewMode?: 'source' | 'rendered';
}

interface Props {
  scenes: SceneItem[];
  aspectRatio: '9:16' | '16:9';
  onAspectRatioChange?: (ratio: '9:16' | '16:9') => void;
  srtEntries?: any[];
  subtitleConfig?: any;
  onSubtitleConfigChange?: (cfg: any) => void;
  watermarkConfig?: WatermarkConfig;
  onWatermarkConfigChange?: (cfg: WatermarkConfig) => void;
  transitionConfig?: TransitionConfig;
  onTransitionConfigChange?: (cfg: TransitionConfig) => void;
  isOpen: boolean;
  onToggle: () => void;
  onSelectScene?: (index: number) => void;
  onSplitScene?: (index: number, timeOffset: number) => void;
  onBatchFlowImages?: () => void;
  onBatchFlowVideos?: () => void;
  onExportCapcut?: () => void;
  onBatchTTS?: () => void;
  onRoughCut?: () => void;
  isFlowBatchGenerating?: boolean;
  onGenerateSceneFlow?: (scene: SceneItem) => void;
  onUpdateScene?: (sceneId: string, patch: Partial<SceneItem>) => void;
}

export const CollapsibleTimelinePreview: React.FC<Props> = ({
  scenes,
  aspectRatio = '16:9',
  onAspectRatioChange,
  srtEntries: externalSrtEntries,
  subtitleConfig,
  onSubtitleConfigChange,
  watermarkConfig,
  onWatermarkConfigChange,
  transitionConfig,
  onTransitionConfigChange,
  isOpen,
  onToggle,
  onSelectScene,
  onSplitScene,
  onBatchFlowImages,
  onBatchFlowVideos,
  onExportCapcut,
  onBatchTTS,
  onRoughCut,
  isFlowBatchGenerating,
  onGenerateSceneFlow,
  onUpdateScene,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenPlayheadMs, setFullscreenPlayheadMs] = useState(0);
  const [isFullscreenPlaying, setIsFullscreenPlaying] = useState(false);

  // CreativeStudio 씬 데이터를 Flow2CapCut AudioTimeline 규격으로 1:1 완벽 정규화 매핑
  const normalizedTimelineScenes = useMemo(() => {
    if (!scenes || scenes.length === 0) {
      return [];
    }

    let accMs = 0;
    return scenes.map((s, idx) => {
      const durSec = Number(s.duration) > 0 ? Number(s.duration) : 3.5;
      const durMs = Math.round(durSec * 1000);
      const startMs = accMs;
      const endMs = accMs + durMs;
      accMs = endMs;

      const formatMs = (ms: number) => {
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const milli = ms % 1000;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
      };

      const startTimeStr = formatMs(startMs);
      const endTimeStr = formatMs(endMs);

      return {
        ...s,
        id: s.id || `scene_${idx + 1}`,
        scene_id: s.scene_id || idx + 1,
        startMs,
        endMs,
        startTime: startTimeStr,
        endTime: endTimeStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        duration: durSec,
        durationMs: durMs,
        image: s.media_url || s.media_path || null,
        imagePath: s.media_path || s.media_url || null,
        videoI2V: s.video_url || s.video_path || null,
        videoI2VPath: s.video_path || s.video_url || null,
        video_i2v_path: s.video_path || s.video_url || null,
        videoPath: s.video_path || s.video_url || null,
        videoI2VDuration: durSec,
        video_i2v_duration: durSec,
        audioPath: s.audio_path || s.audio_url || null,
        audio_path: s.audio_path || s.audio_url || null,
        audioUrl: s.audio_url || null,
        script: s.script || '',
        prompt: s.visual_prompt || s.script || '',
        status: s.visualStatus === 'generating' || s.audioStatus === 'generating' ? 'generating' : 'done'
      };
    });
  }, [scenes]);

  const totalDurationMs = useMemo(() => {
    if (!normalizedTimelineScenes || normalizedTimelineScenes.length === 0) return 0;
    return Math.round(normalizedTimelineScenes.reduce((acc, s) => acc + (s.duration || 3.5), 0) * 1000);
  }, [normalizedTimelineScenes]);

  // AudioPackage 구성 (나레이션 오디오 클립 파이프라인 - 실제 오디오가 생성된 경우에만 구성)
  const audioPackage = useMemo(() => {
    if (!normalizedTimelineScenes || normalizedTimelineScenes.length === 0) return null;
    
    let accMs = 0;
    const clips = normalizedTimelineScenes
      .filter((s) => s.audioPath || s.audioUrl)
      .map((s) => {
        const durSec = Number(s.duration) > 0 ? Number(s.duration) : 3.5;
        const durMs = Math.round(durSec * 1000);
        const startMs = accMs;
        const endMs = accMs + durMs;
        accMs = endMs;

        const startSec = startMs / 1000;
        const endSec = endMs / 1000;

        return {
          id: `narration-${s.id}`,
          file: s.audioPath || s.audioUrl,
          audioPath: s.audioPath || s.audioUrl,
          start: startSec,
          end: endSec,
          startMs: startMs,
          endMs: endMs,
          duration: durSec,
          role: 'narration',
          name: `TTS #${s.scene_id}`
        };
      });

    if (clips.length === 0) return null;

    return {
      folderPath: '',
      media: {
        video: {
          durationMs: totalDurationMs
        }
      },
      tracks: {
        narration: {
          clips
        }
      }
    };
  }, [normalizedTimelineScenes, totalDurationMs]);

  // SRT 자막 엔트리 파이프라인 (externalSrtEntries 우선 적용)
  // 음성이 실제로 생성되어 타임코드가 확정된 후에만 자막을 타임라인에 정확히 렌더링
  const srtEntries = useMemo(() => {
    if (externalSrtEntries && externalSrtEntries.length > 0) {
      return externalSrtEntries;
    }
    if (!normalizedTimelineScenes || normalizedTimelineScenes.length === 0) return [];
    
    // TTS 오디오가 실제 생성 완료된 씬만 필터링
    const completedAudioScenes = normalizedTimelineScenes.filter(
      (s) => (s.audioPath || s.audioUrl) && s.audioStatus === 'completed'
    );
    
    if (completedAudioScenes.length === 0) {
      return []; // 음성 생성 전에는 가짜 자막 블록을 타임라인에 미리 배치하지 않음
    }

    const splitLimit = subtitleConfig?.splitLimit || 24;
    const resultEntries: any[] = [];
    let entryId = 1;

    for (const s of completedAudioScenes) {
      const script = (s.script || '').trim();
      if (!script) continue;

      // 1. 공백 및 단어 경계 기반으로 splitLimit 이하의 균형 잡힌 청크로 분할
      const words = script.replace(/[\r\n]+/g, ' ').split(/\s+/).filter(Boolean);
      const chunks: string[] = [];
      let curWords: string[] = [];

      for (const w of words) {
        const testPhrase = [...curWords, w].join(' ');
        if (testPhrase.length <= splitLimit || curWords.length === 0) {
          curWords.push(w);
        } else {
          chunks.push(curWords.join(' '));
          curWords = [w];
        }
      }
      if (curWords.length > 0) {
        chunks.push(curWords.join(' '));
      }
      if (chunks.length === 0) chunks.push(script);

      const sceneDur = Math.max(500, s.endMs - s.startMs);
      const totalChars = chunks.reduce((acc, c) => acc + Math.max(1, c.length), 0);
      let accMs = s.startMs;

      for (let i = 0; i < chunks.length; i++) {
        const ch = chunks[i];
        const chunkDur = (i === chunks.length - 1)
          ? Math.max(300, s.endMs - accMs)
          : Math.max(300, Math.round((Math.max(1, ch.length) / totalChars) * sceneDur));

        const cueStart = accMs;
        const cueEnd = accMs + chunkDur;
        accMs = cueEnd;

        resultEntries.push({
          id: entryId++,
          scene_id: s.scene_id,
          startMs: cueStart,
          endMs: cueEnd,
          text: ch
        });
      }
    }

    return resultEntries;
  }, [externalSrtEntries, normalizedTimelineScenes, subtitleConfig]);

  // 전체화면 재생 루프
  useEffect(() => {
    if (!isFullscreen || !isFullscreenPlaying) return;
    let lastTime = performance.now();
    let frameId: number;

    const loop = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      setFullscreenPlayheadMs((prev) => {
        const next = prev + dt;
        if (next >= totalDurationMs) {
          setIsFullscreenPlaying(false);
          return 0;
        }
        return next;
      });
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isFullscreen, isFullscreenPlaying, totalDurationMs]);

  // ESC 키로 전체화면 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setIsFullscreenPlaying(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const formatTC = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-full my-4 bg-card rounded-lg border border-border shadow-xs overflow-hidden transition-all duration-200 select-none shrink-0 min-h-[44px]">
      
      {/* 1. 상단 어디를 눌러도 접히고 펼쳐지는 플랫 헤더 바 */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 cursor-pointer border-b border-border transition-colors text-foreground min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <Film className="w-4 h-4 text-primary" />
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-foreground tracking-tight uppercase">
              실시간 멀티트랙 타임라인 & 캔버스 프리뷰 (TIMELINE & REALTIME PREVIEW)
            </h3>
            <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
              Flow AI NLE
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 전체화면 크게 보기 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
            className="h-6 px-2 text-[11px] font-medium bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-border"
            title="모니터 화면 크게 보기 (전체화면)"
          >
            <Maximize2 className="w-3 h-3 mr-1" /> 크게 보기
          </Button>

          {/* Quick Flow Action Buttons */}
          {onBatchFlowImages && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFlowBatchGenerating || scenes.length === 0}
              onClick={(e) => { e.stopPropagation(); onBatchFlowImages(); }}
              className="h-6 px-2 text-[11px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
            >
              <Sparkles className="w-3 h-3 mr-1" /> Flow 이미지 일괄 생성
            </Button>
          )}

          {onBatchFlowVideos && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFlowBatchGenerating || scenes.length === 0}
              onClick={(e) => { e.stopPropagation(); onBatchFlowVideos(); }}
              className="h-6 px-2 text-[11px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
            >
              <Video className="w-3 h-3 mr-1" /> Flow 비디오 일괄 생성
            </Button>
          )}

          {onExportCapcut && (
            <Button
              variant="default"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onExportCapcut(); }}
              className="h-6 px-2.5 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Scissors className="w-3 h-3 mr-1" /> CapCut 내보내기
            </Button>
          )}

          <div className="w-px h-3.5 bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {isOpen ? <><ChevronUp className="w-3.5 h-3.5" /> 접기</> : <><ChevronDown className="w-3.5 h-3.5" /> 펼치기</>}
          </Button>
        </div>
      </div>

      {/* 2. CapCut Pro 3-Zone 통합 전문 NLE 스튜디오 렌더링 */}
      {isOpen && (
        <div className="w-full bg-background flex flex-col relative overflow-hidden transition-all duration-300">
          <CapCutStudioWorkspace
            scenes={scenes}
            aspectRatio={aspectRatio}
            onAspectRatioChange={onAspectRatioChange}
            srtEntries={srtEntries}
            subtitleConfig={subtitleConfig}
            onSubtitleConfigChange={onSubtitleConfigChange}
            watermarkConfig={watermarkConfig}
            onWatermarkConfigChange={onWatermarkConfigChange}
            transitionConfig={transitionConfig}
            onTransitionConfigChange={onTransitionConfigChange}
            onSelectScene={onSelectScene}
            onSplitScene={onSplitScene}
            onBatchFlowImages={onBatchFlowImages}
            onBatchFlowVideos={onBatchFlowVideos}
            onExportCapcut={onExportCapcut}
            onBatchTTS={onBatchTTS}
            onRoughCut={onRoughCut}
            isFlowBatchGenerating={isFlowBatchGenerating}
            onGenerateSceneFlow={onGenerateSceneFlow}
            onUpdateScene={onUpdateScene}
          />
        </div>
      )}
    </div>
  );
};

export default CollapsibleTimelinePreview;
