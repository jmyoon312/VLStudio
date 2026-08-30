import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Sparkles, Video, Film, Scissors, Maximize2, X, Play, Pause, RotateCcw } from 'lucide-react';
import AudioTimeline from '@/features/flow2capcut/components/AudioTimeline/AudioTimeline';
import PreviewPanel from '@/features/flow2capcut/components/AudioTimeline/PreviewPanel';
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
  watermarkConfig?: WatermarkConfig;
  transitionConfig?: TransitionConfig;
  isOpen: boolean;
  onToggle: () => void;
  onSelectScene?: (index: number) => void;
  onSplitScene?: (index: number, timeOffset: number) => void;
  onBatchFlowImages?: () => void;
  onBatchFlowVideos?: () => void;
  onExportCapcut?: () => void;
  isFlowBatchGenerating?: boolean;
  onGenerateSceneFlow?: (scene: SceneItem) => void;
}

export const CollapsibleTimelinePreview: React.FC<Props> = ({
  scenes,
  isOpen,
  onToggle,
  onSelectScene,
  onBatchFlowImages,
  onBatchFlowVideos,
  onExportCapcut,
  isFlowBatchGenerating
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
        startTime: startTimeStr,
        endTime: endTimeStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        duration: durSec,
        image: s.media_url || s.media_path || null,
        imagePath: s.media_path || s.media_url || null,
        image_path: s.media_path || s.media_url || null,
        videoI2V: s.video_url || s.video_path || null,
        videoI2VPath: s.video_path || s.video_url || null,
        video_i2v_path: s.video_path || s.video_url || null,
        videoPath: s.video_path || s.video_url || null,
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
    return Math.round(normalizedTimelineScenes.reduce((acc, s) => acc + (s.duration || 3.5), 0) * 1000) || 5000;
  }, [normalizedTimelineScenes]);

  // AudioPackage 구성 (나레이션 오디오 클립 파이프라인)
  const audioPackage = useMemo(() => {
    let totalMs = 0;
    const clips = normalizedTimelineScenes
      .filter((s) => s.audioPath || s.audioUrl)
      .map((s, i) => {
        const startSec = (s.duration || 3.5) * i;
        const durSec = s.duration || 3.5;
        totalMs += Math.round(durSec * 1000);
        return {
          id: `narration-${s.id}`,
          file: s.audioPath || s.audioUrl,
          audioPath: s.audioPath || s.audioUrl,
          start: startSec,
          end: startSec + durSec,
          startMs: Math.round(startSec * 1000),
          endMs: Math.round((startSec + durSec) * 1000),
          duration: durSec,
          role: 'narration',
          name: `TTS #${s.scene_id}`
        };
      });

    return {
      folderPath: '',
      media: {
        video: {
          durationMs: totalMs || totalDurationMs
        }
      },
      tracks: {
        narration: {
          clips
        }
      }
    };
  }, [normalizedTimelineScenes, totalDurationMs]);

  // SRT 자막 엔트리 파이프라인
  const srtEntries = useMemo(() => {
    return normalizedTimelineScenes.map((s, idx) => ({
      id: idx + 1,
      startTime: s.startTime,
      endTime: s.endTime,
      text: s.script || `자막 #${s.scene_id}`
    }));
  }, [normalizedTimelineScenes]);

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

      {/* 2. Flow2CapCut 검증된 오리지널 AudioTimeline NLE 렌더링 */}
      {isOpen && (
        <div className="w-full bg-background h-[540px] flex flex-col relative overflow-hidden">
          <AudioTimeline
            scenes={normalizedTimelineScenes}
            audioPackage={audioPackage}
            srtEntries={srtEntries}
            compact={false}
            onTitleClick={() => setIsFullscreen(true)}
            titleActive={isFullscreen}
            onClipSelect={(clip: any) => {
              if (clip?.sceneRef) {
                const sceneIdx = normalizedTimelineScenes.findIndex((s) => s.id === clip.sceneRef.id);
                if (sceneIdx >= 0) onSelectScene?.(sceneIdx);
              }
            }}
          />
        </div>
      )}

      {/* 3. 전체화면 시네마틱 프리뷰 모니터 팝업 포털 */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-9999 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-6 select-none animate-in fade-in duration-200">
          {/* Header Controls */}
          <div className="w-full flex items-center justify-between text-white/90 max-w-6xl">
            <div className="flex items-center gap-3">
              <Film className="w-5 h-5 text-blue-400" />
              <span className="font-extrabold text-sm tracking-wide">시네마틱 실시간 프리뷰 모니터 (FULLSCREEN PREVIEW)</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/40">
                1080P HD
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setIsFullscreen(false); setIsFullscreenPlaying(false); }}
              className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
              title="전체화면 닫기 (ESC)"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Center Stage Preview */}
          <div className="flex-1 w-full max-w-5xl flex items-center justify-center my-4 relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black">
            <PreviewPanel
              playheadMs={fullscreenPlayheadMs}
              scenes={normalizedTimelineScenes}
              srtEntries={srtEntries}
              height={580}
              isPlaying={isFullscreenPlaying}
              hiddenRoles={new Set()}
            />
          </div>

          {/* Bottom Transport Bar */}
          <div className="w-full max-w-2xl bg-slate-900/90 border border-white/15 rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl backdrop-blur-lg text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsFullscreenPlaying(p => !p)}
                className="h-8 px-4 font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md rounded-xl"
              >
                {isFullscreenPlaying ? <Pause className="w-4 h-4 mr-1.5 fill-white" /> : <Play className="w-4 h-4 mr-1.5 fill-white" />}
                {isFullscreenPlaying ? '일시정지' : '재생'}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsFullscreenPlaying(false); setFullscreenPlayheadMs(0); }}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                title="처음으로"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              <span className="font-mono text-xs font-bold text-white/90 bg-white/10 px-3 py-1 rounded-lg">
                <span className="text-blue-400">{formatTC(fullscreenPlayheadMs)}</span> / {formatTC(totalDurationMs)}
              </span>
            </div>

            <div className="text-xs text-white/60 font-medium">
              [Space] 재생/정지 · [ESC] 닫기
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CollapsibleTimelinePreview;
