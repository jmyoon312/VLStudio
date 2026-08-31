import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Film,
  Sparkles,
  Scissors,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Type,
  Layers,
  Volume2,
  Music,
  SlidersHorizontal,
  Check,
  Eye,
  EyeOff,
  Lock,
  Smartphone,
  Tv,
  ZoomIn,
  Video,
  Image as ImageIcon,
  Sparkle,
  Wand2,
  RefreshCw,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { STYLE_PRESETS } from '@/features/flow2capcut/config/defaults';
import AudioTimeline from '@/features/flow2capcut/components/AudioTimeline/AudioTimeline';
import PreviewPanel from '@/features/flow2capcut/components/AudioTimeline/PreviewPanel';
import SubtitleConfigPanel from '@/components/shared/SubtitleConfigPanel';
import { WatermarkConfig } from './WatermarkSettingsDialog';
import { TransitionConfig, TRANSITION_PRESETS, TransitionType } from './TransitionSettingsDialog';
import { SceneItem } from './CollapsibleTimelinePreview';

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
  scriptInput?: string;
  onScriptInputChange?: (val: string) => void;
  onGenerateScript?: () => void;
  isGeneratingScript?: boolean;
  onApplyStylePromptToAll?: (prompt: string) => void;
}

export const CapCutStudioWorkspace: React.FC<Props> = ({
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
  scriptInput = '',
  onScriptInputChange,
  onGenerateScript,
  isGeneratingScript = false,
  onApplyStylePromptToAll,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'script' | 'style' | 'subtitles' | 'transitions' | 'watermark' | 'audio' | 'scene'>('subtitles');
  const [selectedStyleCategory, setSelectedStyleCategory] = useState<string>('all');
  const [styleSearchQuery, setStyleSearchQuery] = useState<string>('');
  const [canvasZoom, setCanvasZoom] = useState<'fit' | '50' | '75' | '100' | '150'>('fit');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [kenBurnsEnabled, setKenBurnsEnabled] = useState(false);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio VU Meter simulation values
  const [vuLevels, setVuLevels] = useState<{ left: number; right: number }>({ left: 12, right: 15 });

  useEffect(() => {
    if (!isPlaying) {
      setVuLevels({ left: 4, right: 4 });
      return;
    }
    const interval = setInterval(() => {
      setVuLevels({
        left: Math.floor(Math.random() * 60) + 30,
        right: Math.floor(Math.random() * 65) + 25,
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // CreativeStudio 씬 데이터를 Flow2CapCut AudioTimeline 규격으로 1:1 완벽 정규화 매핑
  const normalizedTimelineScenes = useMemo(() => {
    if (!scenes || scenes.length === 0) return [];

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
        status: s.visualStatus === 'generating' || s.audioStatus === 'generating' ? 'generating' : 'done',
      };
    });
  }, [scenes]);

  const totalDurationMs = useMemo(() => {
    if (!normalizedTimelineScenes || normalizedTimelineScenes.length === 0) return 0;
    return Math.round(normalizedTimelineScenes.reduce((acc, s) => acc + (s.duration || 3.5), 0) * 1000);
  }, [normalizedTimelineScenes]);

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

        return {
          id: `narration-${s.id}`,
          file: s.audioPath || s.audioUrl,
          audioPath: s.audioPath || s.audioUrl,
          start: startMs / 1000,
          end: endMs / 1000,
          startMs: startMs,
          endMs: endMs,
          duration: durSec,
          role: 'narration',
          name: `TTS #${s.scene_id}`,
        };
      });

    if (clips.length === 0) return null;

    return {
      folderPath: '',
      media: { video: { durationMs: totalDurationMs } },
      tracks: { narration: { clips } },
    };
  }, [normalizedTimelineScenes, totalDurationMs]);

  const srtEntries = useMemo(() => {
    if (externalSrtEntries && externalSrtEntries.length > 0) return externalSrtEntries;
    if (!normalizedTimelineScenes || normalizedTimelineScenes.length === 0) return [];

    const completedAudioScenes = normalizedTimelineScenes.filter(
      (s) => (s.audioPath || s.audioUrl) && s.audioStatus === 'completed'
    );
    if (completedAudioScenes.length === 0) return [];

    const splitLimit = subtitleConfig?.splitLimit || 24;
    const resultEntries: any[] = [];
    let entryId = 1;

    for (const s of completedAudioScenes) {
      const script = (s.script || '').trim();
      if (!script) continue;

      const words = script.replace(/[\r\n]+/g, ' ').split(/\s+/).filter(Boolean);
      const chunks: string[] = [];
      let curWords: string[] = [];

      for (const w of words) {
        const candidate = [...curWords, w].join(' ');
        if (candidate.length > splitLimit && curWords.length > 0) {
          chunks.push(curWords.join(' '));
          curWords = [w];
        } else {
          curWords.push(w);
        }
      }
      if (curWords.length > 0) chunks.push(curWords.join(' '));

      const sDur = s.duration || 3.5;
      const sStart = s.startMs / 1000;
      const chunkDur = sDur / chunks.length;

      chunks.forEach((txt, cIdx) => {
        const cStart = sStart + cIdx * chunkDur;
        const cEnd = cStart + chunkDur;
        resultEntries.push({
          id: entryId++,
          start: cStart,
          end: cEnd,
          startMs: Math.round(cStart * 1000),
          endMs: Math.round(cEnd * 1000),
          text: txt,
          scene_id: s.scene_id,
        });
      });
    }
    return resultEntries;
  }, [externalSrtEntries, normalizedTimelineScenes, subtitleConfig]);

  const selectedScene = scenes[selectedSceneIndex] || scenes[0];

  // Quick Preset Styles for Subtitles
  const applyPresetCaption = (presetName: string) => {
    if (!onSubtitleConfigChange) return;
    if (presetName === 'mrbeast') {
      onSubtitleConfigChange({
        ...subtitleConfig,
        font: 'Wanted Sans',
        fontSize: 54,
        textColor: '#FFE600',
        isBold: true,
        outlineSize: 4,
        outlineColor: '#000000',
        shadowSize: 3,
        useBox: false,
      });
      toast.success('🟡 미스터비스트 스타일 자막이 적용되었습니다!');
    } else if (presetName === 'cinematic') {
      onSubtitleConfigChange({
        ...subtitleConfig,
        font: 'Pretendard',
        fontSize: 42,
        textColor: '#FFFFFF',
        isBold: true,
        outlineSize: 0,
        useBox: true,
        boxColor: '#000000',
        boxOpacity: 65,
      });
      toast.success('⚪ 시네마틱 미니멀 자막이 적용되었습니다!');
    } else if (presetName === 'neon') {
      onSubtitleConfigChange({
        ...subtitleConfig,
        font: 'Black Han Sans',
        fontSize: 48,
        textColor: '#00FFFF',
        isBold: true,
        outlineSize: 2,
        outlineColor: '#003366',
        shadowSize: 5,
        shadowColor: '#00FFFF',
        useBox: false,
      });
      toast.success('⚡ 네온 글로우 자막이 적용되었습니다!');
    }
  };

  // Zoom Transform computation
  const zoomScale = useMemo(() => {
    switch (canvasZoom) {
      case '50': return 0.5;
      case '75': return 0.75;
      case '100': return 1.0;
      case '150': return 1.5;
      default: return 1.0;
    }
  }, [canvasZoom]);

  const containerContent = (
    <div className={`flex flex-col bg-[#0b0e14] text-slate-200 border border-border/60 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${isMaximized ? 'fixed inset-0 z-[99999] rounded-none border-none' : 'w-full h-[840px]'}`}>
      {/* ── 1. Pro Studio Top Header ── */}
      <div className="h-11 bg-[#121722] border-b border-white/10 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-blue-400" />
            <span className="font-extrabold text-xs tracking-wider text-white uppercase flex items-center gap-1.5">
              CapCut Pro AI Studio <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30">NLE v3</span>
            </span>
          </div>

          <div className="h-3.5 w-px bg-white/15" />

          {/* Aspect Ratio Switcher */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => onAspectRatioChange?.('16:9')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-all ${aspectRatio === '16:9' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Tv className="w-3 h-3" /> 16:9 와이드
            </button>
            <button
              onClick={() => onAspectRatioChange?.('9:16')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-semibold transition-all ${aspectRatio === '9:16' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'}`}
            >
              <Smartphone className="w-3 h-3" /> 9:16 쇼츠
            </button>
          </div>

          {/* Canvas Zoom Dropdown */}
          <div className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
            <ZoomIn className="w-3 h-3 text-slate-400" />
            <Select value={canvasZoom} onValueChange={(v: any) => setCanvasZoom(v)}>
              <SelectTrigger className="h-6 text-[10.5px] bg-transparent border-none focus:ring-0 text-slate-300 w-[78px] p-0 font-medium">
                <SelectValue placeholder="화면 줌" />
              </SelectTrigger>
              <SelectContent className="bg-[#161c28] border-white/15 text-white">
                <SelectItem value="fit" className="text-xs">화면 맞춤 (Fit)</SelectItem>
                <SelectItem value="50" className="text-xs">50%</SelectItem>
                <SelectItem value="75" className="text-xs">75%</SelectItem>
                <SelectItem value="100" className="text-xs">100% (원래 크기)</SelectItem>
                <SelectItem value="150" className="text-xs">150% (확대)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shorts Safe Zone Toggle */}
          {aspectRatio === '9:16' && (
            <Button
              variant={showSafeZone ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowSafeZone(!showSafeZone)}
              className={`h-6 text-[10.5px] px-2 gap-1 font-semibold ${showSafeZone ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'}`}
              title="유튜브 쇼츠 / 틱톡 UI 가림 안전영역 표시"
            >
              📱 안전 영역
            </Button>
          )}

          {/* Ken Burns Camera Motion Toggle */}
          <Button
            variant={kenBurnsEnabled ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setKenBurnsEnabled(!kenBurnsEnabled)}
            className={`h-6 text-[10.5px] px-2 gap-1 font-semibold ${kenBurnsEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'}`}
          >
            🎥 켄번스 모션 {kenBurnsEnabled ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {onBatchTTS && (
            <Button variant="ghost" size="sm" onClick={onBatchTTS} className="h-7 text-[11px] font-semibold text-slate-300 hover:text-white gap-1 bg-white/5 hover:bg-white/10">
              🎙️ 전체 TTS
            </Button>
          )}
          {onBatchFlowImages && (
            <Button variant="ghost" size="sm" onClick={onBatchFlowImages} disabled={isFlowBatchGenerating} className="h-7 text-[11px] font-semibold text-purple-300 hover:text-purple-200 gap-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30">
              ✨ Flow 이미지
            </Button>
          )}
          {onBatchFlowVideos && (
            <Button variant="ghost" size="sm" onClick={onBatchFlowVideos} disabled={isFlowBatchGenerating} className="h-7 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 gap-1 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30">
              🎬 Flow 영상
            </Button>
          )}
          {onExportCapcut && (
            <Button variant="default" size="sm" onClick={onExportCapcut} className="h-7 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1 px-3 shadow-md">
              <Scissors className="w-3 h-3" /> CapCut 내보내기
            </Button>
          )}

          <div className="h-3.5 w-px bg-white/15 mx-1" />

          {/* Fullscreen Expansion Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-7 w-7 rounded-lg text-slate-300 hover:text-white bg-white/5 hover:bg-white/15"
            title={isMaximized ? '기본 화면으로 축소 (ESC)' : '전체화면 전문 NLE 모드로 확장'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── 2. Top Split: Canvas Stage (Left) & NLE Inspector Tabs (Right) ── */}
      <div className="flex-1 min-h-0 flex bg-[#0a0d14] overflow-hidden">
        {/* Left: Canvas Preview Stage */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 relative bg-[#07090e] border-r border-white/10 overflow-hidden select-none">
          {/* Virtual Zoomable Stage Container */}
          <div
            className="relative flex items-center justify-center transition-transform duration-150"
            style={{
              transform: canvasZoom !== 'fit' ? `scale(${zoomScale})` : 'none',
              transformOrigin: 'center center',
              width: '100%',
              height: '100%',
              maxHeight: '100%',
            }}
          >
            <PreviewPanel
              playheadMs={playheadMs}
              scenes={normalizedTimelineScenes}
              srtEntries={srtEntries}
              subtitleConfig={subtitleConfig}
              height="100%"
              isPlaying={isPlaying}
              hiddenRoles={new Set()}
              aspectRatio={aspectRatio}
              kenBurns={kenBurnsEnabled}
              className="!bg-transparent !p-0 w-full h-full flex items-center justify-center"
            />

            {/* Shorts Safe Zone Overlay */}
            {showSafeZone && aspectRatio === '9:16' && (
              <div className="absolute inset-0 pointer-events-none border border-amber-500/40 rounded-lg flex flex-col justify-between p-3 select-none">
                <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded w-fit self-center">
                  ⚠️ 상단 헤더 / 검색 영역 (피할 위치)
                </div>
                <div className="flex justify-between items-end">
                  <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-1 rounded max-w-[140px]">
                    ⚠️ 하단 제목 / 사운드 UI 영역
                  </div>
                  <div className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-1.5 py-1 rounded text-right">
                    ⚠️ 좋아요/댓글/공유<br />우측 아이콘 바
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Floating Stereo VU Meter */}
          <div className="absolute left-3 bottom-3 flex items-end gap-1 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 pointer-events-none">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-slate-400 font-mono">L</span>
              <div className="w-1.5 h-12 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full transition-all duration-75"
                  style={{
                    height: `${vuLevels.left}%`,
                    background: vuLevels.left > 80 ? '#ef4444' : vuLevels.left > 55 ? '#eab308' : '#22c55e',
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[8px] text-slate-400 font-mono">R</span>
              <div className="w-1.5 h-12 bg-slate-800 rounded-full overflow-hidden flex flex-col justify-end">
                <div
                  className="w-full transition-all duration-75"
                  style={{
                    height: `${vuLevels.right}%`,
                    background: vuLevels.right > 80 ? '#ef4444' : vuLevels.right > 55 ? '#eab308' : '#22c55e',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: NLE Professional Inspector Tabs */}
        <div className="w-[380px] lg:w-[420px] bg-[#121722] flex flex-col shrink-0 border-l border-white/10 select-none">
          <Tabs value={activeInspectorTab} onValueChange={(v: any) => setActiveInspectorTab(v)} className="flex-1 flex flex-col h-full">
            <TabsList className="h-9 bg-black/40 border-b border-white/10 rounded-none grid grid-cols-7 p-0.5">
              <TabsTrigger value="script" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                대본
              </TabsTrigger>
              <TabsTrigger value="style" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                스타일
              </TabsTrigger>
              <TabsTrigger value="subtitles" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                자막
              </TabsTrigger>
              <TabsTrigger value="transitions" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                전환
              </TabsTrigger>
              <TabsTrigger value="watermark" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                워터마크
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                오디오
              </TabsTrigger>
              <TabsTrigger value="scene" className="text-[10px] h-8 px-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold">
                씬속성
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Script Inspector */}
            <TabsContent value="script" className="flex-1 p-3.5 overflow-y-auto space-y-3 m-0">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-blue-400" /> AI 대본 생성 & 스토리라인
                </span>
                <p className="text-[11px] text-slate-400">아이디어를 입력하면 AI가 쇼츠/롱폼에 최적화된 씬별 대본을 작성합니다.</p>
              </div>

              <div className="space-y-2 pt-1">
                <Textarea
                  value={scriptInput}
                  onChange={(e) => onScriptInputChange?.(e.target.value)}
                  placeholder="주제, 핵심 키워드, 스토리 구상, 시청자 타겟 등을 자유롭게 입력하세요..."
                  className="min-h-[90px] text-xs bg-black/30 border-white/15 text-slate-200 rounded-xl"
                />

                {onGenerateScript && (
                  <Button
                    onClick={onGenerateScript}
                    disabled={isGeneratingScript || !scriptInput.trim()}
                    className="w-full h-8.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-1.5 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGeneratingScript ? 'AI 대본 작성 중...' : '✨ AI 대본 자동 생성 및 씬 분할'}
                  </Button>
                )}
              </div>

              <div className="border-t border-white/10 pt-2.5 space-y-2">
                <Label className="text-[11px] font-bold text-slate-300">현재 씬 대본 목록 ({scenes.length}개 씬)</Label>
                <div className="space-y-1.5 max-h-[390px] overflow-y-auto pr-1">
                  {scenes.map((sc, idx) => (
                    <div
                      key={sc.id}
                      onClick={() => {
                        setSelectedSceneIndex(idx);
                        onSelectScene?.(idx);
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${selectedSceneIndex === idx ? 'bg-blue-600/20 border-blue-400/60 text-white' : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'}`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span className="font-bold text-blue-400">씬 #{sc.scene_id}</span>
                        <span>{sc.duration || 3.5}s</span>
                      </div>
                      <p className="text-[11px] line-clamp-2 leading-relaxed">{sc.script || '— 대본 없음 —'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Visual Style Inspector */}
            <TabsContent value="style" className="flex-1 p-3.5 overflow-y-auto space-y-3 m-0">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <LayoutGrid className="w-3.5 h-3.5 text-purple-400" /> 화풍 & 아트 스타일 프리셋
                </span>
                <p className="text-[11px] text-slate-400">원하는 화풍을 선택하면 비주얼 프롬프트에 자동으로 적용됩니다.</p>
              </div>

              {/* Search & Categories */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  placeholder="스타일 검색 (예: 수묵화, 웹툰, 시네마틱...)"
                  value={styleSearchQuery}
                  onChange={(e) => setStyleSearchQuery(e.target.value)}
                  className="w-full h-7.5 px-2.5 text-xs bg-black/30 border border-white/15 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-purple-400"
                />

                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                  {['all', 'webtoon', 'anime', 'cinematic', 'realism', '3d', 'oriental'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedStyleCategory(cat)}
                      className={`px-2 py-0.5 rounded-md font-medium whitespace-nowrap transition-colors ${selectedStyleCategory === cat ? 'bg-purple-600 text-white font-bold' : 'bg-black/30 text-slate-400 hover:text-slate-200'}`}
                    >
                      {cat === 'all' ? '전체' : cat === 'webtoon' ? '웹툰' : cat === 'anime' ? '애니' : cat === 'cinematic' ? '시네마틱' : cat === 'realism' ? '실사' : cat === '3d' ? '3D' : '동양화/사극'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Presets Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[460px] overflow-y-auto pr-1">
                {(STYLE_PRESETS?.styles || [])
                  .filter((s: any) => {
                    const matchQ = !styleSearchQuery || (s.name || '').toLowerCase().includes(styleSearchQuery.toLowerCase()) || (s.category || '').toLowerCase().includes(styleSearchQuery.toLowerCase());
                    const matchCat = selectedStyleCategory === 'all' || (s.category || '').toLowerCase().includes(selectedStyleCategory.toLowerCase());
                    return matchQ && matchCat;
                  })
                  .slice(0, 40)
                  .map((st: any) => (
                    <div
                      key={st.id}
                      onClick={() => {
                        if (onApplyStylePromptToAll) {
                          onApplyStylePromptToAll(st.prompt || st.name);
                        } else if (onUpdateScene && selectedScene) {
                          onUpdateScene(selectedScene.id, { visual_prompt: `${selectedScene.visual_prompt || ''}, ${st.prompt || st.name}`.trim() });
                          toast.success(`Scene #${selectedScene.scene_id}에 ${st.name} 화풍이 적용되었습니다.`);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-white/10 bg-black/25 hover:bg-purple-600/20 hover:border-purple-400/60 cursor-pointer transition-all flex flex-col gap-1 text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 group-hover:text-purple-300">{st.name}</span>
                        <Sparkle className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-[9.5px] text-slate-400 line-clamp-1">{st.category || '화풍'}</span>
                    </div>
                  ))}
              </div>
            </TabsContent>

            {/* Tab 3: Subtitles Inspector */}
            <TabsContent value="subtitles" className="flex-1 p-3.5 overflow-y-auto space-y-3 m-0">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-300">⚡ 원클릭 캡컷 스타일 템플릿</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => applyPresetCaption('mrbeast')} className="h-8 text-[10.5px] font-bold bg-[#ffe600]/15 text-[#ffe600] border-[#ffe600]/30 hover:bg-[#ffe600]/25">
                    🟡 미스터비스트
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPresetCaption('cinematic')} className="h-8 text-[10.5px] font-bold bg-white/10 text-white border-white/20 hover:bg-white/20">
                    ⚪ 시네마틱
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => applyPresetCaption('neon')} className="h-8 text-[10.5px] font-bold bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25">
                    ⚡ 네온 글로우
                  </Button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-2">
                {subtitleConfig && onSubtitleConfigChange && (
                  <SubtitleConfigPanel
                    config={subtitleConfig}
                    onChange={onSubtitleConfigChange}
                    compact={true}
                  />
                )}
              </div>
            </TabsContent>

            {/* Tab 2: Transitions Inspector */}
            <TabsContent value="transitions" className="flex-1 p-3.5 overflow-y-auto space-y-3 m-0">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> 씬 전환 트랜지션 (CapCut Transitions)
                </span>
                <p className="text-[11px] text-slate-400">씬과 씬 사이에 자동으로 삽입될 화면전환 효과를 선택합니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {TRANSITION_PRESETS.map((tr) => (
                  <div
                    key={tr.id}
                    onClick={() => {
                      if (onTransitionConfigChange && transitionConfig) {
                        onTransitionConfigChange({ ...transitionConfig, fixedType: tr.id, mode: 'fixed' });
                        toast.success(`${tr.name} 전환 효과가 적용되었습니다.`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${transitionConfig?.fixedType === tr.id ? 'bg-blue-600/20 border-blue-400 text-white shadow-xs' : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{tr.icon}</span>
                      {transitionConfig?.fixedType === tr.id && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <span className="text-[11px] font-bold">{tr.name}</span>
                    <span className="text-[9.5px] text-slate-400 leading-tight">{tr.desc}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 3: Watermark Inspector */}
            <TabsContent value="watermark" className="flex-1 p-3.5 overflow-y-auto space-y-3.5 m-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">워터마크 / 채널 로고</span>
                <Switch
                  checked={watermarkConfig?.enabled ?? false}
                  onCheckedChange={(c) => onWatermarkConfigChange?.({ ...(watermarkConfig as any), enabled: c })}
                />
              </div>

              {watermarkConfig?.enabled && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-300">텍스트 워터마크</Label>
                    <input
                      type="text"
                      value={watermarkConfig.text || ''}
                      onChange={(e) => onWatermarkConfigChange?.({ ...watermarkConfig, text: e.target.value })}
                      placeholder="@ViraLoopMedia"
                      className="w-full h-8 px-2.5 rounded-lg bg-black/30 border border-white/15 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-300">투명도</span>
                      <span className="text-blue-400 font-bold">{watermarkConfig.opacity}%</span>
                    </div>
                    <Slider
                      value={[watermarkConfig.opacity || 70]}
                      min={10}
                      max={100}
                      step={5}
                      onValueChange={([v]) => onWatermarkConfigChange?.({ ...watermarkConfig, opacity: v })}
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 4: Audio & BGM Inspector */}
            <TabsContent value="audio" className="flex-1 p-3.5 overflow-y-auto space-y-3.5 m-0">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" /> 오디오 & BGM 마스터링
                </span>
                <p className="text-[11px] text-slate-400">나레이션 음성 속도와 배경음악 볼륨을 조절합니다.</p>
              </div>

              <div className="space-y-2.5 p-3 rounded-xl bg-black/20 border border-white/10">
                <Label className="text-[11px] font-bold text-slate-300">🎙️ 나레이션 TTS 재생 속도 (배속)</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['0.9x', '1.0x', '1.15x', '1.3x'].map((spd) => (
                    <Button key={spd} variant="outline" size="sm" className="h-7 text-[10.5px] font-semibold bg-white/5 border-white/10 hover:bg-white/15">
                      {spd}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Selected Scene Inspector */}
            <TabsContent value="scene" className="flex-1 p-3.5 overflow-y-auto space-y-3 m-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  🎬 씬 #{selectedScene?.scene_id || 1} 속성 인스펙터
                </span>
                <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/30">
                  {selectedScene?.duration || 3.5}초
                </Badge>
              </div>

              {selectedScene && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400 font-semibold">대본 (Script)</Label>
                    <p className="text-xs text-slate-200 bg-black/30 p-2.5 rounded-lg border border-white/10 leading-relaxed">
                      {selectedScene.script || '대본이 없습니다.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400 font-semibold">비주얼 프롬프트</Label>
                    <p className="text-[11px] font-mono text-slate-300 bg-black/30 p-2.5 rounded-lg border border-white/10 leading-relaxed">
                      {selectedScene.visual_prompt || selectedScene.video_prompt || '프롬프트 없음'}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    {onGenerateSceneFlow && (
                      <Button
                        size="sm"
                        onClick={() => onGenerateSceneFlow(selectedScene)}
                        className="flex-1 h-8 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white gap-1.5 shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> 이 씬만 Flow 재생성
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── 3. Bottom Split: Fixed Slim 5-Track NLE Timeline ── */}
      <div className="h-[290px] bg-[#0c1017] border-t border-white/10 flex flex-col relative overflow-hidden shrink-0">
        <AudioTimeline
          scenes={normalizedTimelineScenes}
          audioPackage={audioPackage}
          srtEntries={srtEntries}
          subtitleConfig={subtitleConfig}
          compact={true}
          aspectRatio={aspectRatio}
          onPlayheadChange={setPlayheadMs}
          onPlayingChange={setIsPlaying}
          onClipSelect={(clip: any) => {
            if (clip?.sceneRef) {
              const sIdx = normalizedTimelineScenes.findIndex((s) => s.id === clip.sceneRef.id);
              if (sIdx >= 0) {
                setSelectedSceneIndex(sIdx);
                onSelectScene?.(sIdx);
              }
            }
          }}
          onRegenerateScene={(sc, type) => {
            if (type === 'video') {
              if (window.electron?.flow?.generateVideo) {
                toast.info(`Scene #${sc.scene_id} 비디오 재생성을 시작합니다.`);
              }
            } else {
              onGenerateSceneFlow?.(sc);
            }
          }}
          onToggleViewMode={(scId) => {
            const sc = scenes.find((s) => s.id === scId);
            if (sc && onUpdateScene) {
              onUpdateScene(scId, { viewMode: sc.viewMode === 'rendered' ? 'source' : 'rendered' });
            }
          }}
          onSplitScene={(scIdx) => onSplitScene?.(scIdx, 0)}
          onRegenerateTTS={() => onBatchTTS?.()}
          onChangeSpeed={(spd) => {
            if (onUpdateScene && selectedScene) {
              const curDur = selectedScene.duration || 3.5;
              onUpdateScene(selectedScene.id, { duration: Math.max(1.0, Math.round((curDur / spd) * 10) / 10) });
              toast.success(`Scene #${selectedScene.scene_id} 배속 ${spd}x 적용 (길이: ${(curDur / spd).toFixed(1)}s)`);
            }
          }}
        />
      </div>
    </div>
  );

  return containerContent;
};
