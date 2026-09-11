import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Flame,
  Zap,
  Radio,
  Sparkles,
  Scissors,
  FileText,
  ExternalLink,
  X,
  Copy,
  Check,
  Film,
  Send,
  Download,
  FileVideo,
  Layers,
  Volume2,
  Music,
  CheckCircle2,
  Eye,
  Clock
} from 'lucide-react';
import { cn, getMediaUrl } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { generateSmartSeoTags, generateSmartHashtags } from '@/lib/ddalkkakPixeling';
import { ddalkkakApi } from '@/services/ddalkkakApi';

export interface VideoDetailData {
  id?: number | string;
  title?: string;
  name?: string;
  url?: string;
  video_url?: string;
  file_path?: string;
  filePath?: string;
  channel_name?: string;
  uploader?: string;
  view_count?: number;
  viral_score?: number;
  velocity_score?: number;
  duration?: number;
  upload_date?: string;
  review_status?: string;
  description?: string;
  extracted_text?: string;
  content?: string;
  category?: string;
  thumbnail_url?: string;
  sourceType?: 'queue' | 'completed';
  youtube_title?: string;
  youtube_description?: string;
  youtube_tags?: string;
  target_lang?: string;
  style?: string;
  subtitles?: any[];
  jabs?: any[];
  job?: any;
}

interface VideoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  videoUrl?: string;
  filePath?: string;
  sourceType?: 'queue' | 'completed';
  videoData?: VideoDetailData | null;
  onOpenEditor?: () => void;
  onExportCapcut?: () => void;
  onSendToQueue?: () => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  open,
  onOpenChange,
  title,
  videoUrl,
  filePath,
  sourceType = 'queue',
  videoData,
  onOpenEditor,
  onExportCapcut,
  onSendToQueue,
}) => {
  // ─────────────────────────────────────────────────────────────
  // 1. ALL REACT HOOKS MUST BE DECLARED AT THE VERY TOP LEVEL
  //    (NEVER AFTER ANY CONDITIONAL RETURN)
  // ─────────────────────────────────────────────────────────────
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [showFullScript, setShowFullScript] = useState<boolean>(false);
  const [reviewStatus, setReviewStatus] = useState<string>('COLLECTED');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [detailedJob, setDetailedJob] = useState<any>(null);
  const [completedTab, setCompletedTab] = useState<'youtube' | 'subtitles' | 'files'>('youtube');
  const [subtitleSubTab, setSubtitleSubTab] = useState<'situation' | 'jjap' | 'dialogue' | 'script'>('situation');
  const [selectedYtTitle, setSelectedYtTitle] = useState<string>('');

  // reviewStatus 동기화
  useEffect(() => {
    if (videoData?.review_status) {
      setReviewStatus(videoData.review_status);
    }
  }, [videoData?.review_status]);

  // 백엔드 정밀 결과 연동
  useEffect(() => {
    if (!open) {
      setDetailedJob(null);
      return;
    }
    const jobId = videoData?.job?.id || (typeof videoData?.id === 'number' ? videoData.id : null);
    if (!jobId) return;

    let isMounted = true;
    (async () => {
      try {
        let res: any = null;
        if (videoData?.job?.tts_engine !== undefined) {
          res = await ddalkkakApi.getTtsJob(jobId);
        } else {
          res = await ddalkkakApi.getSubtitleJob(jobId);
        }
        if (isMounted && res) {
          setDetailedJob(res);
        }
      } catch (err) {
        console.warn('Failed to fetch detailed job:', err);
      }
    })();

    return () => { isMounted = false; };
  }, [open, videoData?.job?.id, videoData?.id]);

  // 초기 제목 및 상세 데이터 도착 시 제목 동기화
  useEffect(() => {
    if (!open) return;
    const rawJob = detailedJob || videoData?.job || {};
    const rawRes = rawJob.result || {};
    const primary = rawJob.primary_analysis || rawRes.primary || rawRes.primary_analysis || rawRes;
    const candidates = rawJob.title_candidates || primary.candidate_titles || primary.title_candidates || [];

    const defaultTitle = videoData?.youtube_title ||
      primary.youtube_title ||
      primary.main_hook_title ||
      (candidates.length > 0 ? candidates[0].replace(/^\([^)]+\)\s*/, '').trim() : '') ||
      videoData?.title ||
      title ||
      '';

    setSelectedYtTitle(defaultTitle.replace(/\.[^/.]+$/, ''));
  }, [open, detailedJob, videoData, title]);

  // ─────────────────────────────────────────────────────────────
  // 2. CONDITIONAL RETURN (AFTER ALL HOOKS HAVE BEEN EXECUTED)
  // ─────────────────────────────────────────────────────────────
  if (!open) return null;

  // Video duration listener
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDetectedDuration(Math.round(videoRef.current.duration));
    }
  };

  // Resolve media URL
  let resolvedUrl = videoUrl || videoData?.video_url || videoData?.url || '';
  const resolvedFilePath = filePath || videoData?.filePath || videoData?.file_path || '';

  if (!resolvedUrl && resolvedFilePath) {
    resolvedUrl = getMediaUrl(resolvedFilePath);
  } else if (resolvedUrl && !resolvedUrl.startsWith('http') && !resolvedUrl.startsWith('blob:') && !resolvedUrl.startsWith('/')) {
    resolvedUrl = getMediaUrl(resolvedUrl);
  }

  // Determine YouTube vs Local
  const isYouTube = resolvedUrl.includes('youtube.com') || resolvedUrl.includes('youtu.be') || (videoData?.url && (videoData.url.includes('youtube.com') || videoData.url.includes('youtu.be')));
  let ytEmbedUrl = '';
  let ytWatchUrl = '';

  if (isYouTube) {
    const rawYt = resolvedUrl || videoData?.url || '';
    ytWatchUrl = rawYt;
    const match = rawYt.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
    const ytId = match ? match[1] : '';
    if (ytId) {
      ytEmbedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`;
      if (!ytWatchUrl) ytWatchUrl = `https://www.youtube.com/watch?v=${ytId}`;
    }
  }

  // Raw title & language
  const displayTitle = videoData?.title || title || videoData?.name || '영상 제목 없음';
  const langCode = (videoData?.target_lang || 'KO').toUpperCase();

  // YouTube Upload Metadata calculation
  const activeJob = detailedJob || videoData?.job || {};
  const rawResult = activeJob.result || {};
  const primaryAnalysis = activeJob.primary_analysis || rawResult.primary || rawResult.primary_analysis || rawResult;

  // 자막 배열
  const situationSubs: any[] = (videoData?.subtitles && videoData.subtitles.length > 0) 
    ? videoData.subtitles 
    : (primaryAnalysis.situation_subtitles || activeJob.subtitles || []);
  const jjapSubs: any[] = (videoData?.jabs && videoData.jabs.length > 0) 
    ? videoData.jabs 
    : (primaryAnalysis.jjap_jjap_i_subtitles || []);
  const dialogueSubs: any[] = primaryAnalysis.dialogue_subtitles || [];
  const fullScript = primaryAnalysis.full_script || primaryAnalysis.script || videoData?.content || videoData?.extracted_text || '';

  // 후보 제목군
  const titleCandidates: string[] = activeJob.title_candidates || primaryAnalysis.candidate_titles || primaryAnalysis.title_candidates || [
    displayTitle.replace(/\.[^/.]+$/, ''),
    `[실화] ${displayTitle.replace(/\.[^/.]+$/, '')}`,
    `절대 멈출 수 없는 ${displayTitle.replace(/\.[^/.]+$/, '')}`
  ];

  const currentTitle = selectedYtTitle || displayTitle.replace(/\.[^/.]+$/, '');

  // 📝 고품질 유튜브 설명문(Description) 자동 빌드 (스토리 요약 + 채널 콜투액션 + 피드 해시태그)
  const buildYoutubeDescription = () => {
    let rawDesc = videoData?.youtube_description || primaryAnalysis.youtube_description || primaryAnalysis.description || primaryAnalysis.summary || '';
    const isOnlyHashtags = !rawDesc || (rawDesc.trim().startsWith('#') && !rawDesc.includes('\n'));

    let storyBody = '';
    if (!isOnlyHashtags && rawDesc.length > 20) {
      storyBody = rawDesc.replace(/#[\w가-힣]+/g, '').trim();
    }

    if (!storyBody && fullScript) {
      const scriptLines = fullScript.split('\n').map((l: string) => l.trim()).filter(Boolean);
      storyBody = scriptLines.slice(0, 3).join(' ').trim();
    }

    if (!storyBody && situationSubs.length > 0) {
      storyBody = situationSubs.slice(0, 4).map((s: any) => s.text).join(' ');
    }

    if (!storyBody) {
      storyBody = `${currentTitle} - 긴박하고 흥미진진한 하이라이트 순간을 지금 바로 확인하세요!`;
    }

    const hashtags = generateSmartHashtags(currentTitle, langCode, primaryAnalysis.hashtags);

    return `${currentTitle}

🎬 영상 하이라이트:
${storyBody}

──────────────────────
✨ 재미있게 보셨다면 [좋아요]와 [구독] 부탁드립니다!
🔔 알림 설정을 켜두시면 매일 새로운 사이다 쇼츠를 가장 빠르게 만나보실 수 있습니다.
💬 여러분의 생각과 감상을 댓글로 자유롭게 남겨주세요!

${hashtags}`;
  };

  const youtubeDesc = buildYoutubeDescription();
  const youtubeTags = videoData?.youtube_tags || generateSmartSeoTags(currentTitle, langCode, primaryAnalysis.tags);

  // Copy helper
  const copyText = (text: string, label: string, key: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      toast({
        title: `${label} 복사 완료!`,
        description: '클립보드에 복사되었습니다. 유튜브 업로드 시 붙여넣기하세요.',
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (_) {}
  };

  // Queue mode meta
  const channelName = videoData?.channel_name || videoData?.uploader || '인생영화: Legend Movie';
  const views = videoData?.view_count ?? 5566000;
  const viralScore = videoData?.viral_score ?? 556578;
  const durationSec = videoData?.duration || detectedDuration || 3242;
  const uploadDate = videoData?.upload_date ? new Date(videoData.upload_date).toLocaleDateString() : '2024. 9. 22.';
  const category = videoData?.category || '미분류';
  const scriptContent = videoData?.content || videoData?.extracted_text || videoData?.description || 
    '#누아르영화 #마동석 #김무열 - 비지니스 메일 : jinminch@naver.com 로 부탁드립니다! ◈ 악인전 구매 or 대여 유튜브 https://bit.ly/3q9zKq3 네이버 https://bit.ly/35yJgMh ◈ 동네사람들 구매 or 대여 네이버 https://bit.ly/37m8YEY ...';

  const formatCount = (count?: number) => {
    if (!count && count !== 0) return '556.6만';
    if (count >= 100000000) return `${(count / 100000000).toFixed(1)}억`;
    if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
    return count.toLocaleString();
  };

  const renderViralBadge = (score: number) => {
    if (score >= 300) {
      return (
        <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white font-extrabold text-[10px] px-2 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
          <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" /> S등급 {score}%
        </Badge>
      );
    }
    if (score >= 100) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
          <Zap className="w-3 h-3 fill-white" /> A등급 {score}%
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm border-0 flex items-center gap-1 shrink-0">
        <span>🌱</span> B등급 {score}%
      </Badge>
    );
  };

  const token = localStorage.getItem('token') || '';
  const handleDownloadFile = (filename: string) => {
    const jobId = activeJob.id || videoData?.id;
    const downloadUrl = activeJob.subtitle_urls?.[filename] || `/api/ddalkkak/api/subtitle/${jobId}/download/${encodeURIComponent(filename)}?token=${token}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: '파일 다운로드', description: `${filename} 다운로드를 시작합니다.` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] h-[88vh] max-h-[850px] p-0 bg-slate-950 border border-slate-800 text-white overflow-hidden rounded-3xl flex flex-col md:flex-row shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{displayTitle}</DialogTitle>
          <DialogDescription>
            {sourceType === 'queue' ? '대기열 영상 상세 정보 및 딸깍 제작 옵션' : '완성된 쇼츠 영상 재생 및 유튜브 업로드 메타데이터'}
          </DialogDescription>
        </DialogHeader>

        {/* 🎬 좌측: 비디오 플레이어 영역 (9:16 최적화) */}
        <div className="w-full md:w-[46%] h-[42%] md:h-full bg-black relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-800 select-none">
          {resolvedUrl ? (
            isYouTube && ytEmbedUrl ? (
              <iframe
                src={ytEmbedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={resolvedUrl}
                controls
                autoPlay
                playsInline
                loop
                onLoadedMetadata={handleLoadedMetadata}
                className="w-full h-full object-contain bg-black"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400 p-6 text-center">
              <FileVideo className="w-14 h-14 stroke-[1.5] text-slate-500" />
              <div className="text-xs font-bold text-slate-300">재생 가능한 비디오 스트림이 준비되었습니다.</div>
              <div className="text-[10px] text-slate-500 font-mono break-all max-w-xs">{resolvedFilePath || displayTitle}</div>
            </div>
          )}

          {/* 상단 퀵 뱃지 */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 z-20 pointer-events-none">
            {sourceType === 'queue' ? (
              <>
                {renderViralBadge(viralScore)}
                <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                  {category}
                </span>
              </>
            ) : (
              <>
                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-[10px] px-2 py-0.5 shadow-sm border-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> 쇼츠 완제품
                </Badge>
                <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/20">
                  9:16 (1080x1920)
                </span>
              </>
            )}
          </div>

          {/* 우측 상단 유튜브 링크 */}
          {ytWatchUrl && (
            <a
              href={ytWatchUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1 bg-red-600/90 hover:bg-red-600 text-white text-[10.5px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs transition-transform active:scale-95"
            >
              <span className="text-[10px] bg-black/30 px-1 py-0.2 rounded font-mono">CC</span>
              <ExternalLink className="w-3 h-3" />
              <span>유튜브 원본</span>
            </a>
          )}
        </div>

        {/* 📋 우측 패널: 2대 모드 분기 */}
        
        {/* 1️⃣ 대기열 준비 상태 (queue): 수집영상 보관함 세부 재생과 100% 동일 */}
        {sourceType === 'queue' ? (
          <div className="w-full md:w-[54%] h-[58%] md:h-full p-4 sm:p-6 overflow-y-auto flex flex-col justify-between space-y-4 bg-card text-card-foreground">
            <div className="space-y-4">
              {/* 타이틀 및 채널 헤더 */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>채널: <strong className="text-foreground">{channelName}</strong></span>
                  <div className="flex items-center gap-2">
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className={cn(
                        "text-[10.5px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
                        (reviewStatus === 'REVIEWED' && "bg-emerald-500/15 text-emerald-500 border-emerald-500/30") ||
                        (reviewStatus === 'SHORTS_ADAPTED' && "bg-amber-500/15 text-amber-500 border-amber-500/30") ||
                        (reviewStatus === 'LONGFORM_CREATED' && "bg-purple-500/15 text-purple-500 border-purple-500/30") ||
                        (reviewStatus === 'ARCHIVED' && "bg-zinc-500/15 text-zinc-400 border-zinc-500/30") ||
                        "bg-blue-500/15 text-blue-500 border-blue-500/30"
                      )}
                    >
                      <option value="COLLECTED">📥 신규수집</option>
                      <option value="REVIEWED">🧐 검수완료</option>
                      <option value="SHORTS_ADAPTED">⚡ 숏폼각색</option>
                      <option value="LONGFORM_CREATED">🎬 롱폼창작</option>
                      <option value="ARCHIVED">📦 보관</option>
                    </select>
                    <span className="text-[11px] text-muted-foreground">{uploadDate}</span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-foreground leading-snug">
                  {displayTitle}
                </h3>
              </div>

              {/* 메트릭 4분할 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] text-muted-foreground">조회수</p>
                  <p className="text-xs font-extrabold text-foreground mt-0.5">{formatCount(views)}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] text-muted-foreground">바이럴 스코어</p>
                  <p className="text-xs font-extrabold text-amber-500 mt-0.5">{viralScore}%</p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] text-muted-foreground">영상 길이</p>
                  <p className="text-xs font-extrabold text-foreground mt-0.5">{durationSec}초</p>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center">
                  <p className="text-[10px] text-muted-foreground">수집 상태</p>
                  <p className="text-xs font-extrabold text-emerald-500 mt-0.5">보관완료</p>
                </div>
              </div>

              {/* 설명 & 추출 대본 프리뷰 박스 */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-primary" />
                    수집 대본 및 설명
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowFullScript(!showFullScript)}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    {showFullScript ? '간략히 보기 ↑' : '대본 전문보기 →'}
                  </button>
                </div>

                <p className={cn(
                  "leading-relaxed text-[11px] text-muted-foreground select-text font-sans transition-all",
                  !showFullScript && "line-clamp-3"
                )}>
                  {scriptContent}
                </p>
              </div>

              {/* AI 바이럴 점수 분석 */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-primary">
                  <span>📊 AI 바이럴 점수 분석</span>
                  <span className="text-emerald-500 dark:text-emerald-400">상위 1.0%</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  수집된 영상 자산입니다. 딸깍 자동 생성을 통해 자막 합성 및 더빙 버전으로 재가공하여 새로운 숏폼으로 제작할 수 있습니다.
                </p>
              </div>
            </div>

            {/* 하단 바이럴루프 원클릭 제작 액션 버튼 바 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/ddalkkak?tab=subtitle&batch=true&titles=${encodeURIComponent(displayTitle)}&videoUrls=${encodeURIComponent(resolvedUrl || resolvedFilePath)}`);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>⚡ 딸깍 자막 자동 생성</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/ddalkkak?tab=ttsdub&batch=true&titles=${encodeURIComponent(displayTitle)}&videoUrls=${encodeURIComponent(resolvedUrl || resolvedFilePath)}`);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5 text-purple-200" />
                  <span>🎙️ 딸깍 대본+더빙</span>
                </Button>
              </div>

              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  window.location.hash = `#/channel-dna-studio?video_title=${encodeURIComponent(displayTitle)}`;
                }}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span>🌟 채널 DNA 템플릿으로 맞춤 쇼츠 제작</span>
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/script-lab?title=${encodeURIComponent(displayTitle)}`);
                  }}
                  className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>대본 추출 & AI 재창작</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/scene-cutter-pro?title=${encodeURIComponent(displayTitle)}`);
                  }}
                  className="bg-muted hover:bg-muted/80 border-border text-foreground text-xs py-2 flex items-center justify-center gap-1.5 rounded-xl cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <span>✂️ 씬 커터로 컷팅</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* 2️⃣ 작업 큐 & 라이브러리 상태 (completed): 3대 서브 탭을 갖춘 최고급 쇼츠 프로덕션 패널 */
          <div className="w-full md:w-[54%] h-[58%] md:h-full p-4 sm:p-5 overflow-y-auto flex flex-col justify-between space-y-3.5 bg-card text-card-foreground">
            <div className="space-y-3">
              {/* 상단 3대 서브 탭 셀렉터 */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCompletedTab('youtube')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      completedTab === 'youtube'
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>📺 YouTube 메타</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletedTab('subtitles')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      completedTab === 'subtitles'
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>📝 자막·대본 ({situationSubs.length + jjapSubs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCompletedTab('files')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                      completedTab === 'files'
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span>📦 6종 파일</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold text-[10.5px]">
                    {langCode} 쇼츠
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {detectedDuration ? `${detectedDuration}초` : '완성'}
                  </span>
                </div>
              </div>

              {/* 탭 1: 📺 YouTube 업로드 메타데이터 & 제목 후보군 */}
              {completedTab === 'youtube' && (
                <div className="space-y-3">
                  {/* 동영상 제목 (YouTube Title) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                      <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                        <span>📺</span> <span>동영상 제목 (YouTube Title)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(currentTitle, '유튜브 제목', 'yt_title')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'yt_title' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'yt_title' ? '복사됨!' : '1클릭 복사'}</span>
                      </button>
                    </div>
                    <div
                      onClick={() => copyText(currentTitle, '유튜브 제목', 'yt_title')}
                      className="p-2.5 rounded-xl cursor-pointer font-bold text-xs sm:text-sm bg-muted/50 hover:bg-muted/80 border border-border text-foreground shadow-2xs leading-snug transition-colors"
                      title="클릭하여 제목 복사"
                    >
                      {currentTitle}
                    </div>
                  </div>

                  {/* 제목 후보군 (클릭 시 즉시 선택 및 교체) */}
                  {titleCandidates.length > 1 && (
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/30 border border-border/70">
                      <div className="text-[10.5px] font-bold text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>💡</span> <span>AI 추천 바이럴 제목 후보군 (클릭 시 선택)</span>
                        </span>
                        <span className="text-[10px] text-primary">원클릭 제목 교체</span>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                        {titleCandidates.map((cand, cIdx) => {
                          const cleanCand = cand.replace(/^\([^)]+\)\s*/, '').trim();
                          const isSelected = currentTitle === cleanCand;
                          return (
                            <div
                              key={cIdx}
                              onClick={() => {
                                setSelectedYtTitle(cleanCand);
                                copyText(cleanCand, '선택된 제목', `cand_${cIdx}`);
                              }}
                              className={cn(
                                "p-2 rounded-lg text-[11px] cursor-pointer transition flex items-center justify-between border",
                                isSelected
                                  ? "bg-primary/15 border-primary text-primary font-bold shadow-2xs"
                                  : "bg-card hover:bg-muted/50 border-border text-foreground/80 font-medium"
                              )}
                            >
                              <span className="truncate pr-2">{cleanCand}</span>
                              <Badge variant="outline" className={cn("text-[9.5px] shrink-0", isSelected ? "border-primary text-primary" : "border-border")}>
                                {isSelected ? '선택됨' : '선택'}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 동영상 설명 (Description + 해시태그) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                      <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                        <span>📝</span> <span>동영상 설명 (Description + 해시태그)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'yt_desc' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'yt_desc' ? '복사됨!' : '1클릭 복사'}</span>
                      </button>
                    </div>
                    <div
                      onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}
                      className="p-3 rounded-xl cursor-pointer whitespace-pre-line text-[11px] max-h-36 overflow-y-auto custom-scrollbar bg-muted/40 hover:bg-muted/70 border border-border text-foreground/90 shadow-2xs leading-relaxed transition-colors select-text font-sans"
                      title="클릭하여 설명 복사"
                    >
                      {youtubeDesc}
                    </div>
                  </div>

                  {/* 동영상 검색 태그 (Tags / Keywords - 콤마 구분) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
                      <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                        <span>🏷️</span> <span>동영상 검색 태그 (Tags / Keywords - 콤마 구분)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'yt_tags' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'yt_tags' ? '복사됨!' : '1클릭 복사'}</span>
                      </button>
                    </div>
                    <div
                      onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}
                      className="p-2 rounded-xl cursor-pointer font-mono text-[10.5px] max-h-16 overflow-y-auto custom-scrollbar bg-muted/40 hover:bg-muted/70 border border-border text-foreground/80 shadow-2xs leading-normal transition-colors select-text"
                      title="클릭하여 태그 복사"
                    >
                      {youtubeTags}
                    </div>
                  </div>
                </div>
              )}

              {/* 탭 2: 📝 자막 및 대본 실시간 인스펙터 */}
              {completedTab === 'subtitles' && (
                <div className="space-y-2.5">
                  {/* 자막 카테고리 서브 버튼 */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-border">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSubtitleSubTab('situation')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          subtitleSubTab === 'situation'
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        상황설명 ({situationSubs.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubtitleSubTab('jjap')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          subtitleSubTab === 'jjap'
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        쨉쨉이 ({jjapSubs.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubtitleSubTab('dialogue')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          subtitleSubTab === 'dialogue'
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        대사번역 ({dialogueSubs.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setSubtitleSubTab('script')}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                          subtitleSubTab === 'script'
                            ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        풀 대본
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (subtitleSubTab === 'situation') {
                          copyText(situationSubs.map(s => `[${s.start?.toFixed(1)}s] ${s.text}`).join('\n'), '상황 자막', 'copy_all_subs');
                        } else if (subtitleSubTab === 'jjap') {
                          copyText(jjapSubs.map(s => `[${s.start?.toFixed(1)}s] ⚡ ${s.text}`).join('\n'), '쨉쨉이 자막', 'copy_all_subs');
                        } else if (subtitleSubTab === 'dialogue') {
                          copyText(dialogueSubs.map(s => `[${s.start?.toFixed(1)}s] ${s.text}`).join('\n'), '대사 번역', 'copy_all_subs');
                        } else {
                          copyText(fullScript, '풀 대본', 'copy_all_subs');
                        }
                      }}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>전체 복사</span>
                    </button>
                  </div>

                  {/* 타임라인 자막 리스트 */}
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {subtitleSubTab === 'situation' && (
                      situationSubs.length > 0 ? (
                        situationSubs.map((sub, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl text-xs flex items-start gap-2 bg-muted/40 border border-border">
                            <span className="text-blue-500 font-mono font-bold shrink-0 text-[11px]">
                              {sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s
                            </span>
                            <span className="font-medium text-foreground leading-snug">{sub.text}</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">생성된 상황 설명 자막이 없습니다.</div>
                      )
                    )}

                    {subtitleSubTab === 'jjap' && (
                      jjapSubs.length > 0 ? (
                        jjapSubs.map((sub, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl text-xs flex items-start gap-2 bg-amber-500/10 border border-amber-500/30">
                            <span className="text-amber-500 font-mono font-bold shrink-0 text-[11px]">
                              {sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s
                            </span>
                            <span className="font-bold text-amber-500 leading-snug">⚡ {sub.text}</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">생성된 쨉쨉이 자막이 없습니다.</div>
                      )
                    )}

                    {subtitleSubTab === 'dialogue' && (
                      dialogueSubs.length > 0 ? (
                        dialogueSubs.map((sub, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl text-xs flex items-start gap-2 bg-emerald-500/10 border border-emerald-500/30">
                            <span className="text-emerald-500 font-mono font-bold shrink-0 text-[11px]">
                              {sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s
                            </span>
                            <span className="font-medium text-foreground leading-snug">{sub.text}</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-xs text-muted-foreground">생성된 대사 번역 자막이 없습니다.</div>
                      )
                    )}

                    {subtitleSubTab === 'script' && (
                      <div className="p-3 rounded-xl bg-muted/40 border border-border whitespace-pre-line text-xs leading-relaxed text-foreground select-text">
                        {fullScript || '(등록된 풀 스크립트가 없습니다.)'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 탭 3: 📦 AI가 생성한 6종 핵심 결과물 파일 다운로드 */}
              {completedTab === 'files' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                    <span>AI 생성 6대 프로덕션 에셋 (1클릭 다운로드)</span>
                    <span className="text-[10px] text-emerald-500 font-medium">CapCut 프로젝트에 100% 자동 포함됨</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 01_상황설명.srt */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">01_상황설명.srt</div>
                          <div className="text-[10px] text-muted-foreground">{situationSubs.length}개 구간 자막</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('01_상황설명.srt')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 02_쨉쨉이.srt */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">02_쨉쨉이.srt</div>
                          <div className="text-[10px] text-muted-foreground">{jjapSubs.length}개 쨉쨉이 드립</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('02_쨉쨉이.srt')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 03_대사번역.srt */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">03_대사번역.srt</div>
                          <div className="text-[10px] text-muted-foreground">다국어 대사 번역</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('03_대사번역.srt')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 07_효과음믹스.mp3 */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <Music className="w-4 h-4 text-rose-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">07_효과음믹스.mp3</div>
                          <div className="text-[10px] text-muted-foreground">쨉쨉이 연동 SFX</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('07_효과음믹스.mp3')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 06_배경음악.mp3 */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <Volume2 className="w-4 h-4 text-purple-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">06_배경음악.mp3</div>
                          <div className="text-[10px] text-muted-foreground">자동 선곡 BGM</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('06_배경음악.mp3')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 04_풀대본및제목.txt */}
                    <div className="p-2.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between hover:bg-muted/70 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">04_풀대본및제목.txt</div>
                          <div className="text-[10px] text-muted-foreground">전체 텍스트 에셋</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadFile('04_제목후보.txt')}
                        className="p-1.5 rounded-lg bg-background hover:bg-primary/20 text-foreground hover:text-primary transition cursor-pointer"
                        title="다운로드"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 하단 핵심 프로덕션 액션 바 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="grid grid-cols-2 gap-2">
                {onOpenEditor && (
                  <Button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenEditor();
                    }}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>✂️ 전문 편집기로 열기</span>
                  </Button>
                )}

                {onExportCapcut ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onExportCapcut();
                    }}
                    className="border-border bg-background hover:bg-muted text-foreground font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-indigo-500" />
                    <span>🎬 CapCut 내보내기</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownloadFile('video.mp4')}
                    className="border-border bg-background hover:bg-muted text-foreground font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>💾 MP4 다운로드</span>
                  </Button>
                )}
              </div>

              {/* 쇼츠 자동 배포 관리(WorkQueue)로 인계 버튼 */}
              <Button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.setItem('pending_pixeling_meta', JSON.stringify({
                      title: currentTitle,
                      description: youtubeDesc,
                      tags: youtubeTags.split(',').map(t => t.trim()).filter(Boolean),
                      videoUrl: resolvedUrl || resolvedFilePath,
                      category: category,
                      language: langCode
                    }));
                    onOpenChange(false);
                    if (onSendToQueue) {
                      onSendToQueue();
                    } else {
                      navigate('/work-queue');
                    }
                    toast({
                      title: '배포 관리로 인계 완료',
                      description: '유튜브 업로드 메타데이터와 함께 쇼츠 자동 배포 관리로 이동했습니다.',
                    });
                  } catch (e) {
                    console.error('Failed to handoff work queue:', e);
                  }
                }}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 rounded-xl shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>🚀 쇼츠 자동 배포 관리(WorkQueue)로 인계</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewModal;