import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Copy,
  Film,
  Send,
  FileText,
  Music,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Eye,
  CheckCircle2,
  Scissors,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ddalkkakApi } from '@/services/ddalkkakApi';
import { generateSmartSeoTags, generateSmartHashtags } from '@/lib/ddalkkakPixeling';

interface DdalkkakResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  jobType: 'subtitle' | 'tts-dub' | 'clip-edit';
  onExportCapcut: (job: any) => void;
  onSendToPixeling: (job: any) => void;
}

export const DdalkkakResultModal: React.FC<DdalkkakResultModalProps> = ({
  open,
  onOpenChange,
  job,
  jobType,
  onExportCapcut,
  onSendToPixeling,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [detailedResult, setDetailedResult] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'situation' | 'jjap' | 'dialogue' | 'script' | 'audio'>('situation');

  // Video Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<'rendered' | 'overlay'>('rendered');
  const [isRenderingTemplate, setIsRenderingTemplate] = useState<boolean>(false);

  // Fetch full detailed analysis result from backend when modal opens
  useEffect(() => {
    if (!open || !job?.id) return;
    setLoadingDetails(true);

    (async () => {
      try {
        if (jobType === 'subtitle') {
          const res = await ddalkkakApi.getSubtitleJob(job.id);
          setDetailedResult(res);
          if (res?.rendered_video_url) {
            setPlaybackMode('rendered');
          } else {
            setPlaybackMode('overlay');
          }
        } else if (jobType === 'tts-dub') {
          const res = await ddalkkakApi.getTtsJob(job.id);
          setDetailedResult(res);
        } else {
          const res = await ddalkkakApi.getClipJob(job.id);
          setDetailedResult(res);
        }
      } catch (err) {
        console.error('Failed to fetch detailed result:', err);
        setDetailedResult(job);
      } finally {
        setLoadingDetails(false);
      }
    })();
  }, [open, job, jobType]);

  if (!job) return null;

  // Safe parse result from detailedResult or job
  const currentData = detailedResult || job;
  let primary: any = {};
  let candidates: string[] = [];

  // Parse if result is string or object
  try {
    const rawRes = currentData.primary_analysis || (typeof currentData.result === 'string' ? JSON.parse(currentData.result) : (currentData.result || {}));
    primary = rawRes.primary || rawRes.primary_analysis || rawRes;
    candidates = currentData.title_candidates || primary.candidate_titles || [];
  } catch (_) {
    primary = {};
  }

  const copyText = (text: string, label: string, key: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      toast({ title: '복사 완료', description: `${label}이(가) 클립보드에 복사되었습니다.` });
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (_) {
      toast({ title: '오류', description: '클립보드 복사에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 1. YouTube Title
  let youtubeTitle = primary.youtube_title || primary.main_hook_title || '';
  if (!youtubeTitle && candidates.length > 0) {
    youtubeTitle = candidates[0].replace(/^\([^)]+\)\s*/, '');
  }
  if (!youtubeTitle) {
    youtubeTitle = job.video_filename ? job.video_filename.replace(/\.[^/.]+$/, '') : (job.song_title || job.topic || '');
  }

  const langCode = (job.target_lang || 'KO').toUpperCase();

  // 2. YouTube Description
  let youtubeDesc = primary.youtube_description || primary.description || '';
  const formattedHashtags = generateSmartHashtags(youtubeTitle, langCode, primary.hashtags);
  if (!youtubeDesc.includes('#') && formattedHashtags) {
    youtubeDesc = youtubeDesc ? `${youtubeDesc}\n\n${formattedHashtags}` : formattedHashtags;
  }
  if (!youtubeDesc) {
    youtubeDesc = `${youtubeTitle} 영상입니다. 끝까지 시청해주세요!\n\n${formattedHashtags}`;
  }

  // 3. YouTube Tags
  const youtubeTags = generateSmartSeoTags(youtubeTitle, langCode, primary.tags);

  // 4. Subtitles arrays
  const situationSubs: any[] = Array.isArray(primary.situation_subtitles) ? primary.situation_subtitles : [];
  const jjapSubs: any[] = Array.isArray(primary.jjap_jjap_i_subtitles) ? primary.jjap_jjap_i_subtitles : [];
  const dialogueSubs: any[] = Array.isArray(primary.dialogue_subtitles) ? primary.dialogue_subtitles : [];
  const fullScript = primary.full_script || primary.script || '';

  // Title 2-Line Split for Classic Template Overlay
  const titleParts = youtubeTitle.split('\n').filter(Boolean);
  let titleLine1 = titleParts[0] || '코빅 레전드 갱신 ㅋㅋ';
  let titleLine2 = titleParts[1] || '성대 오토튠 이식 직전';
  if (titleParts.length === 1) {
    const words = titleLine1.split(' ');
    if (words.length >= 4) {
      const mid = Math.floor(words.length / 2);
      titleLine1 = words.slice(0, mid).join(' ');
      titleLine2 = words.slice(mid).join(' ');
    }
  }

  // Active Subtitles at current video playback time
  const activeSituationSub = situationSubs.find(s => currentTime >= s.start && currentTime <= s.end)?.text;
  const activeJjapSub = jjapSubs.find(s => currentTime >= s.start && currentTime <= s.end)?.text;

  // Video source URLs
  const token = localStorage.getItem('token') || '';
  const renderedVideoUrl = currentData.rendered_video_url ? `${currentData.rendered_video_url}?token=${token}` : null;
  const rawVideoUrl = currentData.video_url
    ? `${currentData.video_url}?token=${token}`
    : `/api/ddalkkak/api/subtitle/${job.id}/download/${encodeURIComponent(job.video_filename || 'a08b6ad4de.mp4')}?token=${token}`;

  const currentVideoSrc = playbackMode === 'rendered' && renderedVideoUrl ? renderedVideoUrl : rawVideoUrl;

  // Seek video to timestamp when user clicks any subtitle
  const handleSeek = (timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // 1-Click Remotion Template Render Action
  const handleRenderTemplate = async () => {
    if (isRenderingTemplate) return;
    setIsRenderingTemplate(true);
    toast({
      title: '🎬 클래식 템플릿 MP4 렌더링 시작',
      description: 'Remotion 엔진으로 1080x1920 60FPS 최종 영상을 공식 05_Exports에 렌더링합니다...',
    });

    try {
      const res = await ddalkkakApi.renderSubtitleTemplate(job.id);
      if (res?.success) {
        toast({
          title: '🎉 렌더링 완료!',
          description: '클래식 템플릿이 적용된 MP4 파일이 성공적으로 생성되었습니다.',
        });
        // Refresh details
        const updated = await ddalkkakApi.getSubtitleJob(job.id);
        setDetailedResult(updated);
        setPlaybackMode('rendered');
        if (videoRef.current) {
          videoRef.current.load();
        }
      } else {
        throw new Error(res?.error || '렌더링에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Render error:', err);
      toast({
        title: '렌더링 실패',
        description: err?.response?.data?.detail || err?.message || '렌더링 중 문제가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsRenderingTemplate(false);
    }
  };

  const handleDownloadFile = (filename: string) => {
    const downloadUrl = currentData.subtitle_urls?.[filename] || `/api/ddalkkak/api/subtitle/${job.id}/download/${encodeURIComponent(filename)}?token=${token}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-7xl w-[96vw] h-[92vh] max-h-[920px] overflow-hidden flex flex-col p-0 bg-background border-border rounded-3xl shadow-2xl">
        {/* 모달 상단 헤더 */}
        <DialogHeader className="px-5 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl">⚡</span>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                  <span>{job.video_filename || job.song_title || job.topic || `작업 #${job.id}`}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                    {job.target_lang || 'KO'}
                  </Badge>
                </DialogTitle>
                <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>AI 바이럴 쇼츠 자막 및 템플릿 완성본</span>
                  {currentData.duration_sec && (
                    <>
                      <span>·</span>
                      <span>영상 길이: {currentData.duration_sec.toFixed(1)}초</span>
                    </>
                  )}
                  {renderedVideoUrl && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>클래식 MP4 렌더링 완료</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRenderingTemplate}
                onClick={handleRenderTemplate}
                className="h-8 text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRenderingTemplate ? 'animate-spin' : ''}`} />
                <span>{isRenderingTemplate ? 'MP4 렌더링 중...' : '⚡ 클래식 MP4 렌더링'}</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 메인 좌/우 2분할 레이아웃 */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* =========================================================================
              좌측 컬럼: 9:16 비디오 플레이어 & 템플릿 실시간 오버레이
             ========================================================================= */}
          <div className="w-full lg:w-[410px] xl:w-[450px] shrink-0 bg-stone-950 flex flex-col items-center justify-between p-4 border-b lg:border-b-0 lg:border-r border-border overflow-hidden">
            {/* 상단 모드 스위치 */}
            <div className="w-full flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-stone-900/90 p-1 rounded-xl border border-stone-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPlaybackMode('rendered')}
                  disabled={!renderedVideoUrl}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    playbackMode === 'rendered'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : !renderedVideoUrl
                      ? 'opacity-40 cursor-not-allowed text-stone-500'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title={renderedVideoUrl ? '렌더링된 MP4 재생' : '먼저 상단에서 MP4를 렌더링하세요'}
                >
                  <Film className="w-3 h-3" />
                  <span>렌더링 MP4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackMode('overlay')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    playbackMode === 'overlay'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>라이브 오버레이</span>
                </button>
              </div>

              {renderedVideoUrl && (
                <button
                  type="button"
                  onClick={() => handleDownloadFile('job_43_classic_test.mp4')}
                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700/80 flex items-center gap-1 transition"
                  title="렌더링된 MP4 파일 다운로드"
                >
                  <Download className="w-3 h-3" />
                  <span>MP4 저장</span>
                </button>
              )}
            </div>

            {/* 9:16 비디오 캔버스 컨테이너 */}
            <div className="relative w-full max-w-[280px] sm:max-w-[300px] xl:max-w-[320px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center select-none group">
              {/* HTML5 비디오 플레이어 */}
              <video
                ref={videoRef}
                src={currentVideoSrc}
                playsInline
                muted={isMuted}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration || currentData.duration_sec || 0);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-cover"
                onClick={handleTogglePlay}
              />

              {/* [오버레이 모드일 때만 표시되는 실시간 클래식 템플릿 레이어] */}
              {playbackMode === 'overlay' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                  {/* 상단 18.3% 블랙바 & 메인 후킹 타이틀 */}
                  <div className="w-full h-[18.3%] bg-black/90 flex flex-col items-center justify-center px-3 text-center border-b border-white/10 relative z-20">
                    {/* [속보] 레드 뱃지 */}
                    <div className="mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider shadow-sm uppercase">
                        속보
                      </span>
                    </div>
                    {/* 화이트 1줄 + 옐로우 2줄 타이틀 */}
                    <div className="text-xs font-black text-white leading-tight drop-shadow-md truncate w-full">
                      {titleLine1}
                    </div>
                    <div className="text-xs font-black text-[#FFE600] leading-tight drop-shadow-md truncate w-full mt-0.5">
                      {titleLine2}
                    </div>
                  </div>

                  {/* 중앙 비디오 샌드위치 영역: -3도 틸트 쨉쨉이 훅 팝업 */}
                  <div className="flex-1 relative flex items-center justify-center px-4">
                    {activeJjapSub && (
                      <div
                        style={{ transform: 'rotate(-3deg)' }}
                        className="animate-in fade-in zoom-in-95 duration-150 px-3 py-1.5 rounded-xl bg-black/85 border border-[#FFE600] shadow-2xl"
                      >
                        <span className="text-sm font-black text-[#FFE600] tracking-wide drop-shadow-md">
                          ⚡ {activeJjapSub}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 하단 11.0% 블랙바 & 자막 세이프존 */}
                  <div className="w-full h-[22%] flex flex-col justify-end relative z-20">
                    {/* 상황 설명 자막 (하단 75% 높이) */}
                    <div className="min-h-[44px] flex items-center justify-center px-4 pb-2 text-center">
                      {activeSituationSub && (
                        <div className="px-3 py-1 rounded-xl bg-black/80 border border-white/15 text-white font-bold text-xs leading-snug shadow-lg drop-shadow-md">
                          {activeSituationSub}
                        </div>
                      )}
                    </div>

                    {/* 하단 11.0% 블랙 레터박스 바 */}
                    <div className="w-full h-[50%] bg-black/95 border-t border-white/10" />
                  </div>
                </div>
              )}

              {/* 중앙 재생/일시정지 호버 플레이 오버레이 */}
              <div
                onClick={handleTogglePlay}
                className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity cursor-pointer ${
                  isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-xl backdrop-blur-xs">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </div>
              </div>
            </div>

            {/* 플레이어 하단 컨트롤 바 */}
            <div className="w-full mt-3 space-y-2">
              {/* 타임라인 탐색 바 (스크러버) */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-stone-400 shrink-0 w-9 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || currentData.duration_sec || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    if (videoRef.current) {
                      videoRef.current.currentTime = t;
                    }
                    setCurrentTime(t);
                  }}
                  className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-[10px] font-mono text-stone-400 shrink-0 w-9">
                  {formatTime(duration || currentData.duration_sec || 0)}
                </span>
              </div>

              {/* 버튼 컨트롤 행 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700 transition"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700 transition"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-[11px] text-stone-400 font-medium">
                  {playbackMode === 'rendered' ? (
                    <span className="text-emerald-400 font-bold">🎬 MP4 렌더링 파일 재생</span>
                  ) : (
                    <span className="text-amber-400 font-bold">✨ 실시간 템플릿 프리뷰</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              우측 컬럼: 6대 생성물 보관함, 탭 인스펙터, 메타데이터
             ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-card/40">
            {/* 1. 생성된 핵심 결과물 대시보드 (클릭 시 하단 인스펙터에 즉시 내용 표시) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>AI가 생성한 6종 핵심 결과물 (클릭 시 하단 표시 & 타임스탬프 점프)</span>
                </span>
                <span className="text-[11px] text-primary font-medium">CapCut 프로젝트에 자동 포함됨</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 상황 설명 자막 카드 */}
                <div
                  onClick={() => setActiveViewerTab('situation')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeViewerTab === 'situation'
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">상황 설명 자막</div>
                      <div className="text-[10px] text-muted-foreground">{situationSubs.length > 0 ? `${situationSubs.length}개 구간` : '01_상황설명.srt'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('01_상황설명.srt'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 쨉쨉이 강조 자막 카드 */}
                <div
                  onClick={() => setActiveViewerTab('jjap')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeViewerTab === 'jjap'
                      ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">쨉쨉이 강조 자막</div>
                      <div className="text-[10px] text-muted-foreground">{jjapSubs.length > 0 ? `${jjapSubs.length}개 쨉쨉이` : '02_쨉쨉이.srt'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('02_쨉쨉이.srt'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 대사 번역 자막 카드 */}
                <div
                  onClick={() => setActiveViewerTab('dialogue')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeViewerTab === 'dialogue'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">대사 번역 자막</div>
                      <div className="text-[10px] text-muted-foreground">{dialogueSubs.length > 0 ? `${dialogueSubs.length}개 대사` : '03_대사번역.srt'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('03_대사번역.srt'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 효과음 믹스 MP3 카드 */}
                <div
                  onClick={() => setActiveViewerTab('audio')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeViewerTab === 'audio'
                      ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">효과음 믹스 MP3</div>
                      <div className="text-[10px] text-muted-foreground">07_효과음믹스.mp3</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('07_효과음믹스.mp3'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 배경음악 BGM 카드 */}
                <div
                  onClick={() => setActiveViewerTab('audio')}
                  className="p-3 rounded-2xl border border-border bg-card hover:border-border/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">배경음악 BGM</div>
                      <div className="text-[10px] text-muted-foreground">06_배경음악.mp3</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('06_배경음악.mp3'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 풀 스토리 대본 카드 */}
                <div
                  onClick={() => setActiveViewerTab('script')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeViewerTab === 'script'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-xs'
                      : 'border-border bg-card hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">풀 스토리 대본</div>
                      <div className="text-[10px] text-muted-foreground">04_제목후보.txt</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile('04_제목후보.txt'); }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. 상세 뷰어 영역 (클릭 시 비디오 플레이어가 해당 시간으로 즉시 이동) */}
            <div className="border rounded-2xl p-4 bg-muted/20 border-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {activeViewerTab === 'situation' && '상황 설명 자막 타임라인 (클릭 시 해당 구간으로 이동)'}
                    {activeViewerTab === 'jjap' && '쨉쨉이 강조 자막 타임라인 (클릭 시 해당 구간으로 이동)'}
                    {activeViewerTab === 'dialogue' && '대사 번역 자막 타임라인'}
                    {activeViewerTab === 'script' && '풀 스토리 대본'}
                    {activeViewerTab === 'audio' && '오디오 미리듣기'}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (activeViewerTab === 'situation') {
                      copyText(situationSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '상황 자막', 'copy_active_tab');
                    } else if (activeViewerTab === 'jjap') {
                      copyText(jjapSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '쨉쨉이 자막', 'copy_active_tab');
                    } else if (activeViewerTab === 'script') {
                      copyText(fullScript, '대본', 'copy_active_tab');
                    }
                  }}
                  className="h-6 px-2 text-[11px] text-primary"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  <span>전체 복사</span>
                </Button>
              </div>

              {/* 상황 자막 목록 (클릭 시 비디오 점프) */}
              {activeViewerTab === 'situation' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {situationSubs.length > 0 ? (
                    situationSubs.map((sub, sIdx) => {
                      const isCurrent = currentTime >= sub.start && currentTime <= sub.end;
                      return (
                        <div
                          key={sIdx}
                          onClick={() => handleSeek(sub.start)}
                          className={`p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer transition ${
                            isCurrent
                              ? 'bg-primary/20 border-primary text-foreground font-bold shadow-xs'
                              : 'bg-background hover:bg-muted border border-border text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-primary font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                            <span className="truncate">{sub.text}</span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">생성된 상황 설명 자막이 없습니다.</div>
                  )}
                </div>
              )}

              {/* 쨉쨉이 자막 목록 (클릭 시 비디오 점프) */}
              {activeViewerTab === 'jjap' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {jjapSubs.length > 0 ? (
                    jjapSubs.map((sub, sIdx) => {
                      const isCurrent = currentTime >= sub.start && currentTime <= sub.end;
                      return (
                        <div
                          key={sIdx}
                          onClick={() => handleSeek(sub.start)}
                          className={`p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer transition ${
                            isCurrent
                              ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300 font-bold shadow-xs'
                              : 'bg-background hover:bg-muted border border-border text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                            <span className="font-bold truncate text-amber-700 dark:text-amber-300">⚡ {sub.text}</span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">생성된 쨉쨉이 자막이 없습니다.</div>
                  )}
                </div>
              )}

              {/* 대사 번역 자막 목록 */}
              {activeViewerTab === 'dialogue' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {dialogueSubs.length > 0 ? (
                    dialogueSubs.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        onClick={() => handleSeek(sub.start)}
                        className="p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer bg-background hover:bg-muted border border-border text-foreground transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                          <span className="truncate">{sub.text}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-muted-foreground">생성된 대사 번역 자막이 없습니다.</div>
                  )}
                </div>
              )}

              {/* 풀 스토리 대본 */}
              {activeViewerTab === 'script' && (
                <div className="p-3 rounded-xl bg-background border border-border whitespace-pre-line text-xs max-h-48 overflow-y-auto text-foreground leading-relaxed">
                  {fullScript || '(풀 스토리 대본이 없습니다.)'}
                </div>
              )}

              {/* 오디오 플레이어 */}
              {activeViewerTab === 'audio' && (
                <div className="p-4 rounded-xl bg-background border border-border space-y-3 text-center">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">🎵 생성된 효과음 믹스 오디오</div>
                  <audio controls className="w-full h-9 mx-auto">
                    <source src={`/api/ddalkkak/api/subtitle/${job.id}/download/07_효과음믹스.mp3?token=${token}`} type="audio/mpeg" />
                  </audio>
                </div>
              )}
            </div>

            {/* 3. 상단 메인 타이틀 후보군 8종 */}
            {candidates.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-primary flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🔝</span> <span>상단 고정 타이틀 후보군 (클릭 시 복사)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">후킹 / 호기심 / 반전 스타일</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {candidates.map((t, idx) => {
                    const cleanT = t.replace(/^\([^)]+\)\s*/, '');
                    return (
                      <div
                        key={idx}
                        onClick={() => copyText(cleanT, '상단 타이틀', `title_${idx}`)}
                        className="p-2 rounded-xl cursor-pointer transition font-medium flex items-center justify-between bg-muted/40 hover:bg-muted text-foreground border border-border/60"
                      >
                        <span className="truncate pr-2">{t}</span>
                        <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 shrink-0">
                          {copiedKey === `title_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>복사</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. 📺 YouTube 업로드 메타데이터 (제목, 설명(해시태그), 태그(콤마)) */}
            <div className="space-y-3 border rounded-2xl p-4 bg-muted/20 border-border">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>📺</span> <span>YouTube 업로드 메타데이터</span>
                </span>
                <span className="text-[10px] text-muted-foreground">각 항목 클릭 시 1초 만에 복사</span>
              </div>

              {/* 유튜브 제목 */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/80 mb-1">
                  <span>동영상 제목 (YouTube Title)</span>
                  <span className="text-primary cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeTitle, '유튜브 제목', 'yt_title')}>
                    {copiedKey === 'yt_title' ? '✅ 복사됨' : '1클릭 복사'}
                  </span>
                </div>
                <div
                  onClick={() => copyText(youtubeTitle, '유튜브 제목', 'yt_title')}
                  className="p-2.5 rounded-xl cursor-pointer font-bold truncate bg-background hover:bg-muted/60 border border-border text-foreground shadow-2xs"
                >
                  {youtubeTitle}
                </div>
              </div>

              {/* 유튜브 설명 (해시태그 포함) */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/80 mb-1">
                  <span>동영상 설명 (Description + 해시태그)</span>
                  <span className="text-primary cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}>
                    {copiedKey === 'yt_desc' ? '✅ 복사됨' : '1클릭 복사'}
                  </span>
                </div>
                <div
                  onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}
                  className="p-2.5 rounded-xl cursor-pointer whitespace-pre-line max-h-24 overflow-y-auto bg-background hover:bg-muted/60 border border-border text-foreground shadow-2xs"
                >
                  {youtubeDesc}
                </div>
              </div>

              {/* 유튜브 태그 키워드 */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-semibold text-foreground/80 mb-1">
                  <span>동영상 태그 (Tags / Keywords - 콤마 구분)</span>
                  <span className="text-primary cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}>
                    {copiedKey === 'yt_tags' ? '✅ 복사됨' : '1클릭 복사'}
                  </span>
                </div>
                <div
                  onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}
                  className="p-2.5 rounded-xl cursor-pointer font-mono text-[11px] bg-background hover:bg-muted/60 border border-border text-foreground shadow-2xs"
                >
                  {youtubeTags}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 모달 하단 푸터 바 */}
        <div className="p-3.5 px-5 border-t border-border bg-muted/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={() => onSendToPixeling(currentData)}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>📤 픽셀링 메타 화면으로 전송</span>
          </Button>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                try {
                  sessionStorage.setItem('vlstudio_editor_handoff', JSON.stringify({
                    title: youtubeTitle || job.video_filename || `쇼츠 #${job.id}`,
                    videoUrl: currentData.video_path || currentData.video_url || job.video_path || job.video_url,
                    filePath: currentData.video_path || job.video_path,
                    subtitles: situationSubs,
                    jabs: jjapSubs,
                  }));
                  onOpenChange(false);
                  const targetArchetype = (job as any)?.archetype || (job as any)?.template_mode || 'classic';
                  navigate(`/shorts-editor/${targetArchetype}`);
                } catch (e) {
                  console.error('Failed to handoff editor session:', e);
                  toast({
                    title: '편집기 전환 실패',
                    description: '세션 데이터를 저장하는 중 문제가 발생했습니다.',
                    variant: 'destructive',
                  });
                }
              }}
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>✂️ 전문 편집기로 열기</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onExportCapcut(currentData)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 CapCut 내보내기</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl border-border hover:bg-muted"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
