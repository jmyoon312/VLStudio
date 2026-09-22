import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Play,
  Pause,
  Scissors,
  Film,
  FileText,
  Sparkles,
  Music,
  Volume2,
  VolumeX,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Layers,
  RefreshCw,
  Eye,
  Flame,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ExternalLink,
  Clock,
  Sliders,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { cn, getMediaUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { BatchWorkItem } from './BatchWorkQueueSection';
import { generateSmartSeoTags, generateSmartHashtags } from '@/lib/ddalkkakPixeling';

interface WorkItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BatchWorkItem | null;
  onPlay?: (item: BatchWorkItem) => void;
  onEditNle?: (item: BatchWorkItem) => void;
  onExportCapcut?: (item: BatchWorkItem) => void;
  onOpenArchetypeStudio?: (item: BatchWorkItem) => void;
}

// ── 시간 포맷팅 헬퍼 ──
const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const WorkItemDetailModal: React.FC<WorkItemDetailModalProps> = ({
  open,
  onOpenChange,
  item,
  onPlay,
  onEditNle,
  onExportCapcut,
  onOpenArchetypeStudio,
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── 재생 및 모드 상태 ──
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(25);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<'rendered' | 'overlay'>('overlay');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeViewerTab, setActiveViewerTab] = useState<'situation' | 'jjap' | 'dialogue' | 'scenes' | 'script' | 'seo'>('situation');

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (open && item) {
      setCurrentTime(0);
      setIsPlaying(false);
      if (item.videoUrl || item.filePath) {
        setPlaybackMode('rendered');
      } else {
        setPlaybackMode('overlay');
      }
    }
  }, [open, item]);

  const archetype = item?.archetype || 'classic';
  const meta = item?.metadata || {};

  // ── 비디오 소스 URL ──
  const videoSrc = item?.videoUrl
    ? (item.videoUrl.startsWith('http') || item.videoUrl.startsWith('/') ? item.videoUrl : getMediaUrl(item.videoUrl))
    : item?.filePath
    ? getMediaUrl(item.filePath)
    : '';

  // ── 파싱된 자막 데이터 ──
  const situationSubs: Array<{ start: number; end: number; text: string }> = useMemo(() => {
    if (!item) return [];
    if (Array.isArray(meta.situation_subtitles) && meta.situation_subtitles.length > 0) {
      return meta.situation_subtitles;
    }
    if (Array.isArray(meta.subtitles) && meta.subtitles.length > 0) {
      return meta.subtitles.map((s: any) => ({
        start: s.start ?? (s.startMs ? s.startMs / 1000 : 0),
        end: s.end ?? (s.endMs ? s.endMs / 1000 : 4),
        text: s.text || s.narration || ''
      }));
    }
    // 기본 파싱: 대본 기반 4단락 분할 생성
    const rawScript = item.scriptContent || item.sourceSnippet || item.title || '';
    const sentences = rawScript.split(/[.\n]+/).map(s => s.trim()).filter(s => s.length > 2);
    if (sentences.length > 0) {
      return sentences.slice(0, 8).map((st, i) => ({
        start: i * 3.5,
        end: (i + 1) * 3.5,
        text: st
      }));
    }
    return [
      { start: 0, end: 3.5, text: `${item.title} - 지금 바로 공개합니다!` },
      { start: 3.5, end: 7.0, text: '아무도 예상하지 못한 충격적인 사실이 밝혀집니다.' },
      { start: 7.0, end: 11.5, text: '더 자세한 내용은 영상 끝까지 함께 확인해 보세요!' }
    ];
  }, [item, meta]);

  // 쨉쨉이 자막
  const jjapSubs: Array<{ start: number; end: number; text: string }> = useMemo(() => {
    if (Array.isArray(meta.jjap_jjap_i_subtitles) && meta.jjap_jjap_i_subtitles.length > 0) {
      return meta.jjap_jjap_i_subtitles;
    }
    return [
      { start: 1.0, end: 3.5, text: '⚡ 충격 반전 실화!' },
      { start: 6.0, end: 8.5, text: '🔥 반응 폭발 레전드' }
    ];
  }, [meta]);

  // 대사 번역 자막
  const dialogueSubs: Array<{ start: number; end: number; text: string }> = useMemo(() => {
    if (Array.isArray(meta.dialogue_subtitles) && meta.dialogue_subtitles.length > 0) {
      return meta.dialogue_subtitles;
    }
    return situationSubs.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text
    }));
  }, [meta, situationSubs]);

  // 4대 폼팩터 씬 분할 (Hook -> Setup -> Climax -> Punchline)
  const sceneItems = useMemo(() => {
    if (Array.isArray(meta.scenes) && meta.scenes.length > 0) {
      return meta.scenes;
    }
    return [
      {
        sceneIndex: 1,
        phase: 'Hook (0초 훅)',
        script: situationSubs[0]?.text || '시선을 사로잡는 첫 3초 킬링 포인트',
        durationSec: 3.5,
        meme: '🐸 팝콘 페페 (1.5초 펄스)',
        imageDesc: '고화질 화제성 메인 씬 컷',
      },
      {
        sceneIndex: 2,
        phase: 'Setup (상황 전개)',
        script: situationSubs[1]?.text || '본격적인 사건 및 스토리 전개',
        durationSec: 4.0,
        meme: '🐸 경악 페페 (당황)',
        imageDesc: '원문 기사 및 캡처 레이어',
      },
      {
        sceneIndex: 3,
        phase: 'Climax (반전 절정)',
        script: situationSubs[2]?.text || '예상 밖의 최고점 반전 포인트',
        durationSec: 4.5,
        meme: '⚡ 번개 폭발 이펙트',
        imageDesc: 'AI 생성 클라이맥스 씬',
      },
      {
        sceneIndex: 4,
        phase: 'Punchline (결론 & 댓글)',
        script: situationSubs[3]?.text || '시청자 댓글 유도 및 결말',
        durationSec: 3.0,
        meme: '💬 베스트 댓글 플로팅',
        imageDesc: '인스타 액션 & 댓글 카드',
      }
    ];
  }, [meta, situationSubs]);

  // 현재 재생 시간에 해당하는 자막
  const activeSituationSub = situationSubs.find(s => currentTime >= s.start && currentTime <= s.end)?.text;
  const activeJjapSub = jjapSubs.find(s => currentTime >= s.start && currentTime <= s.end)?.text;

  // 썰형 누적 자막 (Accumulate)
  const accumulatedSubs = situationSubs.filter(s => currentTime >= s.start);

  // 2단 타이틀 분할 (클래식/군림보)
  const titleParts = (item?.title || '바이럴 쇼츠 레전드').split(/[:\n|-]/).map(s => s.trim()).filter(Boolean);
  const titleLine1 = titleParts[0] || item?.title || '바이럴 쇼츠 레전드';
  const titleLine2 = titleParts.slice(1).join(' ') || '지금 바로 확인하세요!';

  // 베스트 댓글 (인스타형 플로팅)
  const bestCommentUser = meta.best_comment_user || '@viral_commenter';
  const bestCommentText = meta.best_comment || 'ㅋㅋㅋㅋㅋ 이거 진짜 반전 미쳤다 실화냐고';
  const bestCommentLikes = meta.best_comment_likes || '2.4만';

  // YouTube SEO 메타
  const candidates: string[] = [
    item?.title || '바이럴 쇼츠 레전드',
    `[속보] ${titleLine1} 알고 보니 실화?!`,
    `🔥 ${titleLine1} 역대급 결말 대공개`
  ];
  const langCode = (item?.targetLang || 'KO').toUpperCase();
  const youtubeHashtags = generateSmartHashtags(item?.title || '', langCode, meta.hashtags);
  const youtubeTags = generateSmartSeoTags(item?.title || '', langCode, meta.tags);
  const fullScript = item?.scriptContent || situationSubs.map(s => s.text).join(' ');

  // ── 핸들러 ──
  const handleSeek = (timeSec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
      setCurrentTime(timeSec);
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      setCurrentTime(timeSec);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label}이(가) 클립보드에 복사되었습니다.`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleDownloadAsset = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filename} 파일 다운로드가 시작되었습니다.`);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-7xl w-[96vw] h-[92vh] max-h-[920px] overflow-hidden flex flex-col p-0 bg-background border-border rounded-3xl shadow-2xl">
        {/* ── 1. 모달 상단 헤더 바 ── */}
        <DialogHeader className="px-5 py-3 border-b border-border bg-muted/20 shrink-0 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <span className="text-xl">🎬</span>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                <span>{item.title}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg",
                    archetype === 'instagram' && "bg-purple-500/10 text-purple-500 border-purple-500/30",
                    archetype === 'gunlimbo' && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                    archetype === 'ssul' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                    archetype === 'classic' && "bg-blue-500/10 text-blue-500 border-blue-500/30"
                  )}
                >
                  {archetype === 'instagram' && '📸 인스타형'}
                  {archetype === 'gunlimbo' && '⚡ 군림보형'}
                  {archetype === 'ssul' && '📜 썰형'}
                  {archetype === 'classic' && '📺 클래식형'}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono uppercase text-primary border-primary/30">
                  {item.targetLang || 'KO'}
                </Badge>
              </DialogTitle>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>출처: {item.sourceOrigin || '바이럴 인텔리전스 소스'}</span>
                <span>·</span>
                <span>적용 템플릿: {item.templateId}</span>
                <span>·</span>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>제작 완료</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 듀얼 모드 스위처 */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border text-[11px]">
              <button
                type="button"
                onClick={() => setPlaybackMode('rendered')}
                disabled={!videoSrc}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                  playbackMode === 'rendered'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : !videoSrc
                    ? "opacity-40 cursor-not-allowed text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={videoSrc ? "렌더링된 MP4 재생" : "미디어 파일 생성 전입니다"}
              >
                <Film className="w-3 h-3" />
                <span>렌더링 MP4</span>
              </button>
              <button
                type="button"
                onClick={() => setPlaybackMode('overlay')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer",
                  playbackMode === 'overlay'
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="w-3 h-3" />
                <span>라이브 오버레이</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* ── 2. 메인 2분할 뷰어 (좌측: 9:16 플레이어, 우측: 6대 산출물 & 인스펙터) ── */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* =========================================================================
              좌측: 9:16 모바일 스마트폰 캔버스 플레이어 (4대 폼팩터 실시간 오버레이 엔진)
             ========================================================================= */}
          <div className="w-full lg:w-[410px] xl:w-[450px] shrink-0 bg-stone-950 flex flex-col items-center justify-between p-4 border-b lg:border-b-0 lg:border-r border-border overflow-hidden select-none">
            {/* 9:16 스마트폰 캔버스 래퍼 */}
            <div className="relative w-full max-w-[280px] sm:max-w-[300px] xl:max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-stone-800 flex items-center justify-center group relative">
              {/* HTML5 비디오 플레이어 */}
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  playsInline
                  muted={isMuted}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      setCurrentTime(videoRef.current.currentTime);
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDuration(videoRef.current.duration || 25);
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                  onClick={handleTogglePlay}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 flex flex-col items-center justify-center p-4 text-center">
                  <Film className="w-12 h-12 text-stone-700 mb-2" />
                  <p className="text-xs font-bold text-stone-400">라이브 캔버스 오버레이 모드</p>
                  <p className="text-[10px] text-stone-600 mt-1">4대 폼팩터 전용 렌더링 레이아웃이 실시간 적용됩니다.</p>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────────
                  4대 폼팩터 실시간 오버레이 캔버스 레이어 (라이브 오버레이 모드)
                 ───────────────────────────────────────────────────────────────── */}
              {playbackMode === 'overlay' && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between overflow-hidden">
                  {/* [1] 인스타형: 앰비언트 배경 + 화이트 카드 + 중앙 구멍 비디오 + 자막 밑 베댓 카드 플로팅 */}
                  {archetype === 'instagram' && (
                    <div className="w-full h-full relative flex flex-col items-center justify-center p-3 bg-gradient-to-b from-purple-900/40 via-stone-900/30 to-pink-900/40 backdrop-blur-xs">
                      {/* 화이트 카드 프레임 */}
                      <div className="w-full max-w-[280px] bg-white dark:bg-white text-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-200/80 flex flex-col space-y-2 pointer-events-auto">
                        {/* 상단: 인스타그램 프로필 헤더 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                              <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-[10px] text-slate-900">
                                VL
                              </div>
                            </div>
                            <div>
                              <span className="font-black text-[11px] leading-tight block text-slate-900">
                                {bestCommentUser.replace('@', '')}
                              </span>
                              <span className="text-[8.5px] text-slate-400 font-medium">Sponsored · Seoul</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[9px]">
                              팔로우
                            </span>
                            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>

                        {/* 중앙 구멍(Hole Cutout) 비디오 윈도우 */}
                        <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-inner border border-slate-200/60 flex items-center justify-center">
                          {videoSrc ? (
                            <div className="w-full h-full pointer-events-none opacity-90 flex items-center justify-center">
                              <p className="text-[9px] text-white/50">비디오 홀 렌더링</p>
                            </div>
                          ) : (
                            <div className="text-center p-3">
                              <Film className="w-8 h-8 text-white/40 mx-auto mb-1" />
                              <span className="text-[10px] text-white/80 font-bold block">중앙 영상 홀 윈도우</span>
                              <span className="text-[8.5px] text-white/50">화이트 카드 안쪽에서 영상 재생</span>
                            </div>
                          )}
                        </div>

                        {/* 자막 영역 (영상 홀 바로 밑) */}
                        <div className="min-h-[28px] flex items-center justify-center text-center px-1">
                          <p className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2">
                            {activeSituationSub || titleLine1}
                          </p>
                        </div>

                        {/* 플로팅 베스트 댓글(베댓) 카드 */}
                        <div className="p-2 rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-xs flex items-center justify-between text-[10.5px]">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <span className="font-bold text-blue-600 shrink-0">💬 베댓</span>
                            <p className="text-slate-800 font-medium truncate">
                              "{bestCommentText}"
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 text-[9px] font-bold text-rose-500 shrink-0">
                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                            <span>{bestCommentLikes}</span>
                          </div>
                        </div>

                        {/* 하단 인스타그램 액션 바 */}
                        <div className="flex items-center justify-between pt-1 text-slate-700">
                          <div className="flex items-center gap-3">
                            <Heart className="w-4 h-4 hover:text-rose-500 cursor-pointer" />
                            <MessageCircle className="w-4 h-4 hover:text-blue-500 cursor-pointer" />
                            <Send className="w-4 h-4 hover:text-emerald-500 cursor-pointer" />
                          </div>
                          <Bookmark className="w-4 h-4 hover:text-amber-500 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* [2] 군림보형: 상단 24% 2줄 속보 + 24~34% 훅 밴드 + 페페 밈(1.5초 펄스) + 네온 자막 */}
                  {archetype === 'gunlimbo' && (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* 상단 24% 속보 헤드라인 */}
                      <div className="w-full bg-black/95 p-3 text-center border-b border-white/10 z-20">
                        <div className="mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shadow-sm">
                            속보
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-white leading-tight drop-shadow-md truncate">
                          {titleLine1}
                        </h4>
                        <h5 className="text-xs font-black text-[#FFE600] leading-tight drop-shadow-md truncate mt-0.5">
                          {titleLine2}
                        </h5>
                      </div>

                      {/* 24~34% 반전 훅 밴드 박스 */}
                      <div className="px-4 py-1">
                        <div className="bg-amber-500/90 text-black font-black text-[11px] text-center py-1 rounded-xl shadow-lg border border-yellow-300">
                          ⚡ [충격 실화] 0초 훅 반전 순간 포착!
                        </div>
                      </div>

                      {/* 중앙: 페페 밈 1.5초 펄스 리액션 스탬프 */}
                      <div className="flex-1 relative flex items-center justify-end px-4">
                        <div className="animate-bounce bg-black/80 border border-green-500/60 rounded-2xl p-2 shadow-2xl flex items-center gap-1.5">
                          <span className="text-2xl">🐸</span>
                          <span className="text-[10px] font-black text-green-400">팝콘 페페</span>
                        </div>
                      </div>

                      {/* 하단 75% 고대비 네온 자막 */}
                      <div className="w-full p-4 text-center z-20 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="inline-block px-3 py-1.5 rounded-xl bg-black/90 border border-[#FFE600] shadow-2xl">
                          <span className="text-xs font-black text-[#FFE600] tracking-wide">
                            {activeSituationSub || titleLine1}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* [3] 썰형: 커뮤니티 헤더바(에타/블라인드) + 원문 캡처 + 누적 자막 */}
                  {archetype === 'ssul' && (
                    <div className="w-full h-full flex flex-col justify-between p-3 bg-stone-900/40">
                      {/* 에브리타임 스타일 상단 헤더바 */}
                      <div className="w-full bg-rose-600 text-white p-2 rounded-xl text-center shadow-md">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>에브리타임 핫게시물</span>
                          <span className="opacity-80">익명게시판</span>
                        </div>
                      </div>

                      {/* 원문 텍스트 캡처 카드 */}
                      <div className="p-3 rounded-2xl bg-white/95 text-slate-900 border border-slate-200 shadow-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-bold text-slate-900">익명</span>
                          <span>·</span>
                          <span>방금 전</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed line-clamp-3">
                          {item.sourceSnippet || item.title}
                        </p>
                      </div>

                      {/* 하단: 차곡차곡 쌓여 올라가는 누적 자막 (Accumulate) */}
                      <div className="w-full p-3 bg-black/90 rounded-2xl border border-white/10 space-y-1">
                        <span className="text-[9px] font-mono text-stone-400 block mb-1">📜 썰형 누적 자막:</span>
                        {accumulatedSubs.slice(-3).map((sub, sIdx) => (
                          <p
                            key={sIdx}
                            className={cn(
                              "text-xs leading-snug transition-all",
                              sIdx === accumulatedSubs.slice(-3).length - 1
                                ? "font-black text-[#FFE600] drop-shadow-md"
                                : "text-white/60 font-medium"
                            )}
                          >
                            {sub.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* [4] 클래식형: 상18.3% 하11.0% 레터박스 + 샌드위치 비디오 + -3도 틸트 쨉쨉이 */}
                  {archetype === 'classic' && (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* 상단 18.3% 블랙 레터박스 */}
                      <div className="w-full h-[18.3%] bg-black/95 flex flex-col items-center justify-center px-3 text-center border-b border-white/10 z-20">
                        <div className="mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] tracking-wider uppercase shadow-sm">
                            속보
                          </span>
                        </div>
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

                      {/* 하단 11.0% 블랙 레터박스 & 상황 설명 자막 */}
                      <div className="w-full h-[22%] flex flex-col justify-end z-20">
                        <div className="min-h-[44px] flex items-center justify-center px-4 pb-2 text-center">
                          {activeSituationSub && (
                            <div className="px-3 py-1 rounded-xl bg-black/80 border border-white/15 text-white font-bold text-xs leading-snug shadow-lg drop-shadow-md">
                              {activeSituationSub}
                            </div>
                          )}
                        </div>
                        <div className="w-full h-[50%] bg-black/95 border-t border-white/10" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 중앙 재생/일시정지 호버 플레이 오버레이 */}
              <div
                onClick={handleTogglePlay}
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity cursor-pointer z-30",
                  isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                )}
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
                  max={duration || 25}
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
                  {formatTime(duration || 25)}
                </span>
              </div>

              {/* 버튼 컨트롤 행 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700 transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700 transition cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-[11px] text-stone-400 font-medium">
                  {playbackMode === 'rendered' ? (
                    <span className="text-emerald-400 font-bold">🎬 MP4 렌더링 파일</span>
                  ) : (
                    <span className="text-amber-400 font-bold">✨ 실시간 폼팩터 프리뷰</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              우측: 6대 핵심 산출물 다운로드 카드 & 인터랙티브 탭 인스펙터
             ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-card/40 custom-scrollbar">
            {/* 1. AI가 생성한 6대 핵심 결과물 다운로드 카드 (자막 생성기와 100% 동일 규격) */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>AI가 생성한 6종 핵심 결과물 (클릭 시 하단 인스펙터 전환 & 타임스탬프 점프)</span>
                </span>
                <span className="text-[11px] text-primary font-medium">CapCut 프로젝트에 자동 포함</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. 상황 설명 자막 */}
                <div
                  onClick={() => setActiveViewerTab('situation')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'situation'
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">상황 설명 자막</div>
                      <div className="text-[10px] text-muted-foreground">{situationSubs.length}개 구간 · srt</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAsset('01_상황설명.srt', situationSubs.map((s, idx) => `${idx + 1}\n${formatTime(s.start)},000 --> ${formatTime(s.end)},000\n${s.text}\n`).join('\n'));
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 2. 쨉쨉이 강조 자막 */}
                <div
                  onClick={() => setActiveViewerTab('jjap')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'jjap'
                      ? "border-amber-500 bg-amber-500/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">쨉쨉이 강조 자막</div>
                      <div className="text-[10px] text-muted-foreground">{jjapSubs.length}개 쨉쨉이 · srt</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAsset('02_쨉쨉이.srt', jjapSubs.map((s, idx) => `${idx + 1}\n${formatTime(s.start)},000 --> ${formatTime(s.end)},000\n${s.text}\n`).join('\n'));
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 3. 대사 번역 자막 */}
                <div
                  onClick={() => setActiveViewerTab('dialogue')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'dialogue'
                      ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">대사 / 씬 자막</div>
                      <div className="text-[10px] text-muted-foreground">{dialogueSubs.length}개 대사 · srt</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAsset('03_대사번역.srt', dialogueSubs.map((s, idx) => `${idx + 1}\n${formatTime(s.start)},000 --> ${formatTime(s.end)},000\n${s.text}\n`).join('\n'));
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4. 효과음 믹스 MP3 */}
                <div
                  onClick={() => setActiveViewerTab('scenes')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'scenes'
                      ? "border-indigo-500 bg-indigo-500/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">4대 폼팩터 씬 설계</div>
                      <div className="text-[10px] text-muted-foreground">{sceneItems.length}개 씬 단계</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info('씬 블루프린트 데이터가 확인되었습니다.');
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 5. 풀 스토리 대본 */}
                <div
                  onClick={() => setActiveViewerTab('script')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'script'
                      ? "border-purple-500 bg-purple-500/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">풀 스토리 대본</div>
                      <div className="text-[10px] text-muted-foreground">{fullScript.length}자 · 원고</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadAsset('04_제목후보.txt', fullScript);
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="다운로드"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 6. YouTube SEO 메타 */}
                <div
                  onClick={() => setActiveViewerTab('seo')}
                  className={cn(
                    "p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                    activeViewerTab === 'seo'
                      ? "border-rose-500 bg-rose-500/10 shadow-xs"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">YouTube SEO 메타</div>
                      <div className="text-[10px] text-muted-foreground">제목/태그 3종</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(youtubeTags, 'SEO 태그', 'tags_top');
                    }}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
                    title="SEO 태그 복사"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. 상세 인스펙터 뷰어 (클릭 시 비디오 플레이어가 해당 시간으로 즉시 이동) */}
            <div className="border rounded-2xl p-4 bg-muted/20 border-border space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {activeViewerTab === 'situation' && '상황 설명 자막 타임라인 (행 클릭 시 해당 초로 비디오 점프)'}
                    {activeViewerTab === 'jjap' && '쨉쨉이 강조 자막 타임라인 (행 클릭 시 해당 초로 비디오 점프)'}
                    {activeViewerTab === 'dialogue' && '대사 / 씬 자막 타임라인 (행 클릭 시 해당 초로 비디오 점프)'}
                    {activeViewerTab === 'scenes' && '4대 폼팩터 씬별 상세 행동 절차 (대본 ➔ 음성TTS ➔ 이미지/밈 ➔ 합성)'}
                    {activeViewerTab === 'script' && '풀 스토리 대본 전문'}
                    {activeViewerTab === 'seo' && 'YouTube 알고리즘 100점 SEO 메타데이터'}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (activeViewerTab === 'situation') {
                      copyToClipboard(situationSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '상황 자막', 'copy_active');
                    } else if (activeViewerTab === 'jjap') {
                      copyToClipboard(jjapSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '쨉쨉이 자막', 'copy_active');
                    } else if (activeViewerTab === 'script') {
                      copyToClipboard(fullScript, '대본 전문', 'copy_active');
                    }
                  }}
                  className="h-6 px-2 text-[11px] text-primary"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  <span>{copiedKey === 'copy_active' ? '복사됨' : '전체 복사'}</span>
                </Button>
              </div>

              {/* 상황 자막 목록 (클릭 시 비디오 시크) */}
              {activeViewerTab === 'situation' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {situationSubs.map((sub, sIdx) => {
                    const isCurrent = currentTime >= sub.start && currentTime <= sub.end;
                    return (
                      <div
                        key={sIdx}
                        onClick={() => handleSeek(sub.start)}
                        className={cn(
                          "p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer transition",
                          isCurrent
                            ? "bg-primary/20 border-primary text-foreground font-bold shadow-xs"
                            : "bg-background hover:bg-muted border border-border text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-primary font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                          <span className="truncate">{sub.text}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 쨉쨉이 자막 목록 */}
              {activeViewerTab === 'jjap' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {jjapSubs.map((sub, sIdx) => {
                    const isCurrent = currentTime >= sub.start && currentTime <= sub.end;
                    return (
                      <div
                        key={sIdx}
                        onClick={() => handleSeek(sub.start)}
                        className={cn(
                          "p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer transition",
                          isCurrent
                            ? "bg-amber-500/20 border-amber-500 text-foreground font-bold shadow-xs"
                            : "bg-background hover:bg-muted border border-border text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-amber-500 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                          <span className="truncate">{sub.text}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 대사 자막 목록 */}
              {activeViewerTab === 'dialogue' && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {dialogueSubs.map((sub, sIdx) => {
                    const isCurrent = currentTime >= sub.start && currentTime <= sub.end;
                    return (
                      <div
                        key={sIdx}
                        onClick={() => handleSeek(sub.start)}
                        className={cn(
                          "p-2 rounded-xl text-[11px] flex items-center justify-between cursor-pointer transition",
                          isCurrent
                            ? "bg-emerald-500/20 border-emerald-500 text-foreground font-bold shadow-xs"
                            : "bg-background hover:bg-muted border border-border text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-emerald-500 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                          <span className="truncate">{sub.text}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 opacity-60" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4대 폼팩터 씬별 상세 행동 절차 블루프린트 */}
              {activeViewerTab === 'scenes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {sceneItems.map((sc, sIdx) => (
                    <div key={sIdx} className="p-2.5 rounded-xl bg-background border border-border space-y-1">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="font-bold text-primary">씬 #{sc.sceneIndex}: {sc.phase}</span>
                        <span className="text-muted-foreground font-mono">{sc.durationSec}초</span>
                      </div>
                      <p className="text-xs text-foreground font-medium line-clamp-2">
                        "{sc.script}"
                      </p>
                      <div className="flex items-center justify-between text-[9.5px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>{sc.imageDesc}</span>
                        <span className="text-amber-500 font-bold">{sc.meme}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 풀 스토리 대본 */}
              {activeViewerTab === 'script' && (
                <div className="p-3 rounded-xl bg-background border border-border text-xs leading-relaxed max-h-48 overflow-y-auto select-text font-sans custom-scrollbar">
                  <p className="whitespace-pre-wrap">{fullScript}</p>
                </div>
              )}

              {/* YouTube SEO 메타 */}
              {activeViewerTab === 'seo' && (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  <div>
                    <span className="text-[10.5px] font-bold text-muted-foreground block mb-1">
                      추천 타이틀 3종 (클릭 시 복사):
                    </span>
                    <div className="space-y-1">
                      {candidates.map((cand, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => copyToClipboard(cand, '제목', `cand_${cIdx}`)}
                          className="p-1.5 rounded-lg bg-background hover:bg-muted border border-border text-[11px] font-bold flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{cand}</span>
                          <span className="text-[9.5px] text-primary">{copiedKey === `cand_${cIdx}` ? '복사됨' : '복사'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-bold text-muted-foreground block mb-1">
                      해시태그 및 키워드 태그:
                    </span>
                    <div className="p-2 rounded-lg bg-background border border-border text-[11px] text-muted-foreground font-mono">
                      {youtubeHashtags}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. 모달 하단 4대 액션 바 (CapCut 내보내기 · Pro NLE 세부편집 · 전용 스튜디오 열기) ── */}
        <div className="px-5 py-3 bg-muted/30 border-t border-border flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onExportCapcut && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onExportCapcut(item);
                }}
                className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer rounded-xl"
              >
                <Film className="w-3.5 h-3.5" />
                <span>📦 CapCut 1:1 초안 내보내기</span>
              </Button>
            )}

            {onEditNle && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEditNle(item);
                }}
                className="h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
              >
                <Scissors className="w-3.5 h-3.5 text-primary" />
                <span>✂️ Pro NLE 세부 편집</span>
              </Button>
            )}

            {archetype && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  if (onOpenArchetypeStudio) {
                    onOpenArchetypeStudio(item);
                  } else {
                    navigate(`/shorts-editor/${archetype}`, {
                      state: {
                        fromBatch: true,
                        title: item.title,
                        subtitle: titleLine2,
                        sourceUrl: item.sourceOrigin,
                        script: {
                          scenes: sceneItems.map(s => ({
                            narration: s.script,
                            hook_jab_text: s.meme,
                            duration_sec: s.durationSec
                          }))
                        }
                      }
                    });
                  }
                }}
                className="h-8 text-xs font-bold gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-xl cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-500" />
                <span>🎨 {archetype.toUpperCase()} 전용 스튜디오 열기</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default WorkItemDetailModal;
