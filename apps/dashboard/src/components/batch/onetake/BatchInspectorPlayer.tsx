import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Copy,
  Download,
  Film,
  FileText,
  Music,
  Check,
  Sparkles,
  ExternalLink,
  Edit3,
  Wand2,
  CheckCircle2,
  Scissors
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';

export interface BatchInspectorPlayerProps {
  activeJob: any | null;
  onUpdateJobSubtitle?: (jobId: string, subtitleIndex: number, newText: string) => void;
}

export const BatchInspectorPlayer: React.FC<BatchInspectorPlayerProps> = ({
  activeJob,
  onUpdateJobSubtitle,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Active Tab in Inspector
  const [activeTab, setActiveTab] = useState<'subtitles' | 'audio' | 'meta' | 'export'>('subtitles');

  // Video player controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable subtitles local state
  const [subtitles, setSubtitles] = useState<any[]>([]);

  useEffect(() => {
    if (activeJob) {
      const subs = activeJob.subtitles || activeJob.pixeling_meta?.subtitles || [];
      setSubtitles(subs);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.load();
      }
    } else {
      setSubtitles([]);
    }
  }, [activeJob]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast({ title: '복사 완료', description: `${label}이(가) 클립보드에 복사되었습니다.` });
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (_) {
      toast({ title: '오류', description: '클립보드 복사 실패', variant: 'destructive' });
    }
  };

  const handleSubtitleTextChange = (idx: number, newText: string) => {
    const updated = [...subtitles];
    updated[idx] = { ...updated[idx], text: newText };
    setSubtitles(updated);
    if (activeJob && onUpdateJobSubtitle) {
      onUpdateJobSubtitle(activeJob.id, idx, newText);
    }
  };

  const handleExportCapCut = async () => {
    if (!activeJob) return;
    try {
      toast({ title: '🎬 CapCut 프로젝트 생성 중', description: '타임라인 및 미디어를 번들링합니다...' });
      await exportCapCutFullProject(activeJob);
      toast({ title: '🎉 CapCut 내보내기 성공', description: 'CapCut 프로젝트가 05_Exports에 패키징되었습니다.' });
    } catch (e: any) {
      toast({ title: '내보내기 실패', description: e.message, variant: 'destructive' });
    }
  };

  const handleHandoffToEditor = (isPro: boolean = false) => {
    if (!activeJob) return;
    const path = isPro ? '/pro-editor' : `/shorts-editor/${activeJob.archetype || 'classic'}`;
    navigate(path, {
      state: {
        fromBatch: true,
        jobId: activeJob.id,
        title: activeJob.title,
        videoUrl: activeJob.stream_url || activeJob.video_path,
        subtitles: subtitles,
        metadata: activeJob.metadata,
      }
    });
  };

  // Video Source URL helper
  const videoSrc = activeJob?.stream_url
    ? (activeJob.stream_url.startsWith('http') ? activeJob.stream_url : `${window.location.origin}${activeJob.stream_url}`)
    : (activeJob?.video_path || '');

  // Meta parsing
  const pixelingMeta = activeJob?.pixeling_meta || {};
  const titleCandidates = pixelingMeta.title_candidates || [activeJob?.title || '쇼츠 프로젝트'];
  const hashtags = pixelingMeta.hashtags || ['#쇼츠', '#viral', '#shorts'];
  const description = pixelingMeta.description || `${activeJob?.title || '영상'}\n\n${hashtags.join(' ')}`;

  if (!activeJob) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center h-72 shadow-xs">
        <Film className="w-10 h-10 text-muted-foreground/40 mb-3" />
        <h4 className="text-xs font-bold text-foreground">결과물 즉시 검수 플레이어</h4>
        <p className="text-[11px] text-muted-foreground max-w-xs mt-1">
          중앙 대기열에서 완료된 프로젝트를 클릭하면 실시간 비디오 재생 및 자막/메타데이터 정밀 검수창이 로드됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 shadow-xs flex flex-col gap-3">
      {/* 1. 상단 인스펙터 제목 & 배지 */}
      <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/30 uppercase">
            {activeJob.archetype || 'classic'}
          </Badge>
          <span className="text-xs font-bold text-foreground truncate" title={activeJob.title}>
            {activeJob.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeJob.duration_seconds && (
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {activeJob.duration_seconds.toFixed(1)}s
            </span>
          )}
          <Badge variant="secondary" className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
            완료 🟢
          </Badge>
        </div>
      </div>

      {/* 2. 메인 뷰: 비디오 플레이어(좌) + 탭 인스펙터(우) 2분할 */}
      <div className="flex flex-col sm:flex-row gap-3 min-h-0">
        {/* 비디오 플레이어 (9:16 모바일 비율) */}
        <div className="w-full sm:w-[155px] xl:w-[175px] shrink-0 bg-stone-950 rounded-xl overflow-hidden border border-border flex flex-col relative group">
          <div className="relative aspect-[9/16] w-full flex items-center justify-center bg-black">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />
            ) : (
              <div className="text-[10px] text-stone-500 text-center p-2">
                비디오 스트림 로딩 중...
              </div>
            )}

            {/* 비디오 중앙 재생 오버레이 버튼 */}
            <button
              type="button"
              onClick={togglePlay}
              className={cn(
                "absolute inset-0 m-auto w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs",
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
              )}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
          </div>

          {/* 비디오 하단 타임코드 & 음소거 컨트롤러 */}
          <div className="px-2 py-1 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-[9.5px] text-stone-400 font-mono">
            <span>{formatTime(currentTime)} / {formatTime(duration || activeJob.duration_seconds || 0)}</span>
            <button type="button" onClick={toggleMute} className="hover:text-white cursor-pointer">
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* 탭 인스펙터 (자막 타임라인 / 오디오 / 메타 / 내보내기) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* 인스펙터 4대 탭 헤더 */}
          <div className="flex items-center gap-1 border-b border-border/80 pb-1.5 mb-2 overflow-x-auto text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('subtitles')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === 'subtitles' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              📝 자막 타임라인 ({subtitles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === 'audio' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              🎙️ 오디오/더빙
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('meta')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === 'meta' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              🏷️ AI 메타/SEO
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={cn(
                "px-2 py-1 rounded-lg font-bold transition-all cursor-pointer",
                activeTab === 'export' ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              🎬 내보내기
            </button>
          </div>

          {/* 탭 본문 영역 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto max-h-[175px] pr-1 custom-scrollbar text-xs">
            {/* 1. 자막 타임라인 탭 (인라인 텍스트 수정 가능) */}
            {activeTab === 'subtitles' && (
              <div className="space-y-1.5">
                {subtitles.length > 0 ? (
                  subtitles.map((s, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-2 text-[11px]">
                      <span className="font-mono text-[9.5px] text-muted-foreground shrink-0 w-14">
                        {typeof s.start === 'number' ? s.start.toFixed(1) : s.start}s ~
                      </span>
                      <input
                        type="text"
                        value={s.text || ''}
                        onChange={(e) => handleSubtitleTextChange(idx, e.target.value)}
                        className="flex-1 bg-background border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground p-2">생성된 자막 데이터가 없습니다.</p>
                )}
              </div>
            )}

            {/* 2. 오디오/더빙 탭 */}
            {activeTab === 'audio' && (
              <div className="space-y-2 p-1 text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                  <span className="text-muted-foreground">음성 엔진:</span>
                  <strong className="text-foreground">{activeJob.metadata?.voiceEngine || 'Supertone Local'} ({activeJob.metadata?.voiceId || 'F1'})</strong>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                  <span className="text-muted-foreground">배경음(BGM):</span>
                  <strong className="text-foreground">{activeJob.metadata?.bgmTrack || 'AI 자동 매칭 (서스펜스/텐션)'}</strong>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                  <span className="text-muted-foreground">효과음(SFX):</span>
                  <strong className="text-emerald-500 font-semibold">AI 자동 씬 매칭 활성화 (0ms 딜레이)</strong>
                </div>
              </div>
            )}

            {/* 3. AI 메타데이터 & SEO 탭 */}
            {activeTab === 'meta' && (
              <div className="space-y-2 p-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-muted-foreground">유튜브 훅 제목 후보:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(titleCandidates.join('\n'), '전체 제목 목록', 'titles')}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      {copiedKey === 'titles' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>전체 복사</span>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {titleCandidates.slice(0, 3).map((title: string, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-1.5 p-1 rounded bg-muted/40 text-[10.5px]">
                        <span className="truncate">{i + 1}. {title}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(title, '제목', `title-${i}`)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          title="복사"
                        >
                          {copiedKey === `title-${i}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-muted-foreground">스마트 해시태그:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(hashtags.join(' '), '해시태그', 'hashtags')}
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      {copiedKey === 'hashtags' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>태그 복사</span>
                    </button>
                  </div>
                  <div className="text-[10.5px] font-mono text-primary p-1 bg-muted/30 rounded">
                    {hashtags.join(' ')}
                  </div>
                </div>
              </div>
            )}

            {/* 4. 내보내기 & 편집기 전송 탭 */}
            {activeTab === 'export' && (
              <div className="space-y-2 p-1">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleExportCapCut}
                    className="h-8 text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1 rounded-xl cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 CapCut 내보내기</span>
                  </Button>

                  <a
                    href={videoSrc}
                    download={activeJob.video_filename || `${activeJob.id}.mp4`}
                    className="h-8 text-xs font-bold border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center gap-1 rounded-xl"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>💾 MP4 저장</span>
                  </a>
                </div>

                <div className="pt-1 border-t border-border/60 grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleHandoffToEditor(false)}
                    className="h-8 text-[11px] font-bold bg-muted hover:bg-muted/80 text-foreground gap-1 rounded-xl cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    <span>전용 편집기로 전송</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleHandoffToEditor(true)}
                    className="h-8 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1 rounded-xl cursor-pointer shadow-xs"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>프로 편집기(Pro NLE)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
