import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Sparkles, Video, Film, Scissors } from 'lucide-react';
import AudioTimeline from '@/features/flow2capcut/components/AudioTimeline/AudioTimeline';
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
  // CreativeStudio 씬 데이터를 Flow2CapCut AudioTimeline 규격으로 1:1 완벽 정규화 매핑
  const normalizedTimelineScenes = useMemo(() => {
    if (!scenes || scenes.length === 0) {
      // 대본 입력 전 기본 플레이스홀더 씬 1개 제공
      return [{
        id: 'scene_placeholder',
        scene_id: 1,
        script: '대본을 입력하고 [씬 분할]을 누르면 비디오/이미지/나레이션 트랙이 자동 배치됩니다',
        prompt: 'Scene placeholder',
        startTime: '00:00:00,000',
        endTime: '00:00:05,000',
        start_time: '00:00:00,000',
        end_time: '00:00:05,000',
        duration: 5.0,
        status: 'idle'
      }];
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
          durationMs: totalMs || Math.round(normalizedTimelineScenes.reduce((acc, s) => acc + (s.duration || 3.5), 0) * 1000)
        }
      },
      tracks: {
        narration: {
          clips
        }
      }
    };
  }, [normalizedTimelineScenes]);

  // SRT 자막 엔트리 파이프라인
  const srtEntries = useMemo(() => {
    return normalizedTimelineScenes.map((s, idx) => ({
      id: idx + 1,
      startTime: s.startTime,
      endTime: s.endTime,
      text: s.script || `자막 #${s.scene_id}`
    }));
  }, [normalizedTimelineScenes]);

  return (
    <div className="w-full my-4 bg-card rounded-lg border border-border shadow-xs overflow-hidden transition-all duration-200 select-none">
      
      {/* 1. 상단 어디를 눌러도 접히고 펼쳐지는 플랫 헤더 바 */}
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 cursor-pointer border-b border-border transition-colors text-foreground"
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

      {/* 2. Flow2CapCut 검증된 오리지널 AudioTimeline NLE 렌더링 (확실한 고정 높이 부여) */}
      {isOpen && (
        <div className="w-full bg-background h-[540px] flex flex-col relative overflow-hidden">
          <AudioTimeline
            scenes={normalizedTimelineScenes}
            audioPackage={audioPackage}
            srtEntries={srtEntries}
            compact={false}
            onClipSelect={(clip: any) => {
              if (clip?.sceneRef) {
                const sceneIdx = normalizedTimelineScenes.findIndex((s) => s.id === clip.sceneRef.id);
                if (sceneIdx >= 0) onSelectScene?.(sceneIdx);
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default CollapsibleTimelinePreview;
