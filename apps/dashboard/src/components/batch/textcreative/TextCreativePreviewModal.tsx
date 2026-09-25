import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Download,
  Film,
  Sparkles,
  Layers,
  Copy,
  Check,
  X,
  ExternalLink,
  Clock,
  Mic,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { EnhancedStageJob, SceneDetail } from './TextCreativeQueueConsole';

interface TextCreativePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: EnhancedStageJob | null;
  onExportCapCut?: (id: string) => void;
  onRenderRemotion?: (id: string) => void;
}

export const TextCreativePreviewModal: React.FC<TextCreativePreviewModalProps> = ({
  open,
  onOpenChange,
  job,
  onExportCapCut,
  onRenderRemotion
}) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const scenes: SceneDetail[] = job?.scenes && job.scenes.length > 0
    ? job.scenes
    : [
        {
          sceneId: 1,
          script: job?.title || '엄마의 마지막 도시락',
          visualPrompt: 'Cinematic 9:16 emotional storytelling, warm lighting',
          durationSec: 4.0
        }
      ];

  const totalDuration = scenes.reduce((acc, s) => acc + s.durationSec, 0) || 10;

  // 현재 시간에 해당하는 활성 씬 계산
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (currentTime >= accumulatedTime && currentTime < accumulatedTime + scenes[i].durationSec) {
      activeSceneIndex = i;
      break;
    }
    accumulatedTime += scenes[i].durationSec;
    if (i === scenes.length - 1) activeSceneIndex = i;
  }
  const activeScene = scenes[activeSceneIndex];

  // SpeechSynthesis 초기화
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // 재생 타이머 루프
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      return;
    }

    // 재생 시작 시 현재 씬부터 음성 낭독
    if (synthRef.current && !isMuted && activeScene) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(activeScene.script);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.2;
      synthRef.current.speak(utterance);
    }

    const step = (now: number) => {
      if (lastTimeRef.current !== null) {
        const delta = (now - lastTimeRef.current) / 1000;
        setCurrentTime(prev => {
          const next = prev + delta;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      lastTimeRef.current = now;
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, isMuted, activeSceneIndex]);

  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (synthRef.current) synthRef.current.cancel();
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (synthRef.current) synthRef.current.cancel();
  };

  const handleJumpToScene = (index: number) => {
    let t = 0;
    for (let i = 0; i < index; i++) {
      t += scenes[i].durationSec;
    }
    handleSeek(t);
  };

  const handleCopyFullScript = () => {
    const fullText = scenes.map(s => s.script).join('\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast({
      title: '📋 전체 대본 복사 완료',
      description: '클립보드에 전체 씬 대본이 복사되었습니다.'
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col bg-card border-border p-5 overflow-hidden">
        {/* 모달 상단 헤더 */}
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 uppercase text-[10px] font-bold">
                  {job.archetype || 'SSUL'} 폼팩터
                </Badge>
                {job.toneLabel && (
                  <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px]">
                    {job.toneLabel}
                  </Badge>
                )}
                {job.focusPersons && job.focusPersons.length > 0 && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    인물 {job.focusPersons.join(', ')}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-base font-bold text-foreground mt-1 truncate">
                {job.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                총 {scenes.length}개 씬 · 총 {totalDuration.toFixed(1)}초 · 9:16 쇼츠 텍스트 창작 프로젝트 프리뷰
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* 메인 2열 그리드: 좌측 9:16 쇼츠 캔버스 vs 우측 씬 시퀀스 인스펙터 */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 py-3 overflow-hidden">
          {/* 좌측: 9:16 모바일 쇼츠 실시간 시뮬레이션 캔버스 (md:col-span-5) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-black/90 rounded-xl p-3 border border-border/80 shadow-inner relative overflow-hidden">
            {/* 9:16 비율 컨테이너 */}
            <div className="relative w-full max-w-[240px] aspect-[9/16] bg-gradient-to-b from-slate-900 via-neutral-900 to-black rounded-lg border border-border/60 overflow-hidden shadow-2xl flex flex-col justify-between p-3.5 select-none">
              {/* 상단: 씬 번호 및 앰비언트 인디케이터 */}
              <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
                <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs font-bold text-primary">
                  SCENE #{activeSceneIndex + 1}/{scenes.length}
                </span>
                <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                  <Mic className="w-3 h-3 text-emerald-400" />
                  TTS
                </span>
              </div>

              {/* 중앙: 서사 분위기 비주얼 힌트 */}
              <div className="my-auto text-center px-2 space-y-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center animate-pulse">
                  <Film className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] text-white/50 font-mono line-clamp-2">
                  {activeScene?.visualPrompt}
                </p>
              </div>

              {/* 하단: 실시간 볼드 숏폼 자막 (영상 화면 중앙/하단에 텍스트가 실제로 떠오름) */}
              <div className="pb-3 text-center">
                <div
                  className="bg-black/70 backdrop-blur-sm rounded-lg p-2.5 border border-white/10 shadow-lg transform transition-all duration-200 scale-100"
                >
                  <p
                    className="font-black text-sm text-[#FFE500] leading-snug tracking-tight"
                    style={{
                      textShadow: '2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000',
                      WebkitTextStroke: '0.5px #000'
                    }}
                  >
                    {activeScene?.script}
                  </p>
                </div>
              </div>
            </div>

            {/* 캔버스 하단 미니 컨트롤러 바 */}
            <div className="w-full max-w-[240px] mt-2.5 flex items-center justify-between gap-1 text-xs text-white">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleTogglePlay}
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={handleStop}
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                >
                  <Square className="w-3 h-3 fill-current" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <span className="font-mono text-[10px] text-white/80">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* 시간 탐색 슬라이더 */}
            <div className="w-full max-w-[240px] mt-1">
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={e => handleSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          {/* 우측: 씬별 타임라인 시퀀스 & 프롬프트 인스펙터 (md:col-span-7) */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-2 overflow-hidden">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                분할된 씬 시퀀스 목록 ({scenes.length}개 씬)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyFullScript}
                className="h-6 text-[10px] font-bold px-2 gap-1 border-border"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '복사됨' : '대본 전체 복사'}</span>
              </Button>
            </div>

            {/* 씬 리스트 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[48vh] pr-1">
              {scenes.map((sc, idx) => {
                const isActive = idx === activeSceneIndex;
                return (
                  <div
                    key={sc.sceneId}
                    onClick={() => handleJumpToScene(idx)}
                    className={cn(
                      'p-2.5 rounded-lg border transition cursor-pointer text-left space-y-1 shadow-2xs',
                      isActive
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-primary font-mono flex items-center gap-1">
                        #{sc.sceneId} 씬
                        {isActive && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary text-primary-foreground">현재 재생</Badge>}
                      </span>
                      <span className="font-mono text-muted-foreground text-[10px]">
                        {sc.durationSec}초
                      </span>
                    </div>

                    <p className="text-xs font-bold text-foreground leading-snug">
                      {sc.script}
                    </p>

                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {sc.visualPrompt}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 모달 푸터: CapCut 내보내기 & Remotion 고속 렌더링 액션 */}
        <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>제작 완성물은 %LOCALAPPDATA%\ViraLoop Studio\media\05_Exports\ 에 보관됩니다.</span>
          </div>

          <div className="flex items-center gap-2">
            {onExportCapCut && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onExportCapCut(job.id);
                  onOpenChange(false);
                }}
                className="h-8 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CapCut 초안 프로젝트 내보내기</span>
              </Button>
            )}

            {onRenderRemotion && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onRenderRemotion(job.id);
                  onOpenChange(false);
                }}
                className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Remotion MP4 고속 렌더링</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-bold"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
