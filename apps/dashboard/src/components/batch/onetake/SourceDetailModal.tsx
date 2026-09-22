import React, { useState } from 'react';
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
  FileText,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Zap,
  TrendingUp,
  Clock,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  Scissors,
  Layers,
  Film
} from 'lucide-react';
import { cn, getMediaUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { SourceItem } from '../tabs/OneTakeBatchTab';
import { MasterSourceType } from './OneTakeSourceSection';
import { InlineArticleRenderer } from '@/components/viral/InlineArticleRenderer';

interface SourceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: SourceItem | null;
  activeSourceType: MasterSourceType;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onGoToScriptWriter?: (item: SourceItem) => void;
  onGoToProEditor?: (item: SourceItem) => void;
}

// ── SRT 태그 클리닝 헬퍼 ──
const cleanSrtToText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/^WEBVTT[^\n]*\n/gm, '')
    .replace(/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}[^\n]*/g, '')
    .replace(/^\s*\d+\s*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[(?:music|applause|laughter|sound|음악|박수|웃음|기타)[^\]]*\]/gi, '')
    .replace(/\((?:music|applause|laughter|sound|음악|박수|웃음)[^)]*\)/gi, '')
    .replace(/^\s*>>\s*/gm, '')
    .replace(/&gt;&gt;/g, '')
    .replace(/>>/g, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

// ── 3초 훅 분리 헬퍼 ──
const extractHookSentence = (text: string): { hook: string; remainder: string } => {
  const cleaned = cleanSrtToText(text);
  if (!cleaned) return { hook: '', remainder: '' };
  const match = cleaned.match(/^([^.!?\n]+[.!?]?)/);
  if (match && match[1] && match[1].length < 80) {
    const hook = match[1].trim();
    const remainder = cleaned.slice(match[0].length).trim();
    return { hook, remainder };
  }
  if (cleaned.length > 50) {
    return {
      hook: cleaned.slice(0, 48) + '...',
      remainder: cleaned.slice(48)
    };
  }
  return { hook: cleaned, remainder: '' };
};

// ── 유튜브 embed URL 헬퍼 ──
const getYoutubeEmbedUrl = (rawUrl?: string, videoId?: string): string => {
  let ytId = videoId;
  if (!ytId && rawUrl) {
    const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/);
    if (match && match[1]) ytId = match[1];
  }
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0`;
  return '';
};

// ── 숫자 포맷팅 ──
const formatCount = (val?: number | string) => {
  if (!val) return '0';
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return '0';
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toLocaleString();
};

export const SourceDetailModal: React.FC<SourceDetailModalProps> = ({
  open,
  onOpenChange,
  sourceItem,
  activeSourceType,
  isSelected,
  onToggleSelect,
  onGoToScriptWriter,
  onGoToProEditor
}) => {
  const [copiedText, setCopiedText] = useState(false);

  if (!sourceItem) return null;

  const meta = sourceItem.metadata || {};
  const isVideoOrScript = activeSourceType === 'script' || activeSourceType === 'video';
  const isArticle = activeSourceType === 'community' || activeSourceType === 'news' || activeSourceType === 'reddit';

  // 원본 URL 및 유튜브 ID 추출
  const rawUrl = meta.url || meta.webpage_url || '';
  const videoId = meta.video_id;
  const ytEmbedUrl = getYoutubeEmbedUrl(rawUrl, videoId);
  const localVideoPath = meta.file_path || meta.video_path || meta.filePath || '';
  const localVideoUrl = localVideoPath ? getMediaUrl(localVideoPath) : '';

  // 대본 텍스트 클리닝
  const rawScript = meta.content || meta.extracted_text || meta.description || sourceItem.snippet || '';
  const fullCleanScript = cleanSrtToText(rawScript);
  const { hook, remainder } = extractHookSentence(rawScript);

  // 기사 데이터
  const articleContent = meta.content_text || sourceItem.snippet || '';
  const articleImages = meta.images || [];

  // 메트릭 계산
  const score = meta.viral_score ?? meta.score ?? 78;
  const views = meta.view_count ?? meta.views ?? 0;
  const comments = meta.comments_count ?? meta.comment_count ?? 0;
  const channelName = meta.channel_name || meta.uploader || sourceItem.sourceOrigin || '수집 크리에이터';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success(`${label}이(가) 클립보드에 복사되었습니다.`);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-card border-border p-0 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ── 1. 모달 상단 헤더 바 ── */}
        <DialogHeader className="p-4 border-b border-border/80 flex flex-row items-center justify-between space-y-0 text-left bg-muted/20">
          <div className="flex items-center gap-2 min-w-0 pr-4">
            <Badge
              variant="outline"
              className={cn(
                "text-[10.5px] font-bold px-2 py-0.5 rounded-lg shrink-0",
                activeSourceType === 'script' && "bg-amber-500/15 text-amber-500 border-amber-500/30",
                activeSourceType === 'video' && "bg-blue-500/15 text-blue-500 border-blue-500/30",
                activeSourceType === 'community' && "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
                activeSourceType === 'news' && "bg-purple-500/15 text-purple-500 border-purple-500/30",
                activeSourceType === 'reddit' && "bg-orange-500/15 text-orange-500 border-orange-500/30"
              )}
            >
              {activeSourceType === 'script' && '📝 대본 분석실'}
              {activeSourceType === 'video' && '🎬 영상 보관함'}
              {activeSourceType === 'community' && '💬 커뮤니티 100'}
              {activeSourceType === 'news' && '📰 실시간 뉴스 100'}
              {activeSourceType === 'reddit' && '🌐 레딧 100'}
            </Badge>

            <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
              {sourceItem.sourceOrigin}
            </span>

            <span className="text-muted-foreground/40 text-xs">•</span>
            <span className="text-[11px] text-muted-foreground shrink-0">{sourceItem.dateText}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 발주 선택 원클릭 토글 */}
            <Button
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              onClick={() => onToggleSelect(sourceItem.id)}
              className={cn(
                "h-8 text-xs font-bold gap-1.5 px-3 rounded-xl transition-all cursor-pointer",
                isSelected ? "bg-primary text-primary-foreground shadow-xs" : "hover:border-primary/60"
              )}
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>{isSelected ? "발주 대상 선택됨" : "일괄 발주 선택"}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* ── 2. 메인 컨텐츠 뷰어 영역 ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* A. 대본 및 영상 모드 (대본 분석실 & 영상 보관함 1:1 레이아웃) */}
          {isVideoOrScript && (
            <div className="flex flex-col lg:flex-row gap-5 items-start">
              {/* 좌측: 비디오 플레이어 (유튜브 iframe / 로컬 MP4) */}
              <div className="w-full lg:w-[46%] shrink-0 space-y-2">
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border/80 shadow-md flex items-center justify-center group">
                  {ytEmbedUrl ? (
                    <iframe
                      src={ytEmbedUrl}
                      title={sourceItem.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : localVideoUrl ? (
                    <video
                      src={localVideoUrl}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center">
                      <Film className="w-10 h-10 opacity-40" />
                      <p className="text-xs font-bold">비디오 스트리밍 준비 완료</p>
                      <p className="text-[10.5px] opacity-70">클릭하여 외부 브라우저에서 시청하거나 대본을 검수하세요.</p>
                    </div>
                  )}

                  {/* 유튜브 원본 새창 링크 */}
                  {rawUrl && (
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs transition-transform active:scale-95 cursor-pointer"
                      title="유튜브 원본 새 탭 열기"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>유튜브 원본</span>
                    </a>
                  )}
                </div>

                {/* 4대 메트릭 요약 그리드 */}
                <div className="grid grid-cols-4 gap-1.5 p-2 bg-muted/20 border border-border/60 rounded-xl text-center">
                  <div className="p-1">
                    <p className="text-[9.5px] text-muted-foreground">조회수</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{formatCount(views)}</p>
                  </div>
                  <div className="p-1">
                    <p className="text-[9.5px] text-muted-foreground">화제성 점수</p>
                    <p className="text-xs font-bold text-amber-500 mt-0.5">{typeof score === 'number' ? score.toFixed(1) : score}점</p>
                  </div>
                  <div className="p-1">
                    <p className="text-[9.5px] text-muted-foreground">댓글 반응</p>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">{comments}개</p>
                  </div>
                  <div className="p-1">
                    <p className="text-[9.5px] text-muted-foreground">검수 상태</p>
                    <p className="text-xs font-bold text-emerald-500 mt-0.5">정상 수집</p>
                  </div>
                </div>
              </div>

              {/* 우측: 제목 & 3초 훅 & 대본 전문 스크롤 뷰어 */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h4 className="text-base font-extrabold text-foreground leading-snug">
                    {sourceItem.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    채널/출처: <strong className="text-foreground">{channelName}</strong>
                  </p>
                </div>

                {/* 3초 바이럴 훅 박스 */}
                {hook && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10.5px] font-black text-amber-600 dark:text-amber-400 block mb-0.5">
                        🔥 3초 바이럴 훅 (Hook):
                      </span>
                      <p className="text-xs text-foreground font-semibold leading-relaxed">
                        "{hook}"
                      </p>
                    </div>
                  </div>
                )}

                {/* 수집 대본 전문 스크롤 뷰어 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>수집 발화 대본 전문</span>
                      {fullCleanScript.length > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                          {fullCleanScript.length.toLocaleString()}자 · 약 {Math.max(5, Math.round(fullCleanScript.length / 6))}초
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(fullCleanScript, '대본 전문')}
                      className="h-6 text-[11px] font-bold text-primary hover:bg-primary/10 px-2 rounded-md flex items-center gap-1"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText ? '복사됨' : '대본 복사'}</span>
                    </Button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto rounded-xl bg-muted/40 p-3.5 border border-border/80 text-xs leading-relaxed text-foreground select-text font-sans space-y-2 custom-scrollbar">
                    {fullCleanScript ? (
                      <p className="whitespace-pre-wrap">{fullCleanScript}</p>
                    ) : (
                      <p className="text-muted-foreground italic">수집된 대본 텍스트가 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. 커뮤니티/뉴스/레딧 모드 (바이럴 인텔리전스 리치 리더) */}
          {isArticle && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Flame className="w-3.5 h-3.5 fill-amber-500" />
                    화제성 {score}점
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground">댓글 {comments}개</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground">{sourceItem.sourceOrigin}</span>
                </div>

                <h3 className="text-lg font-bold text-foreground leading-snug">
                  {sourceItem.title}
                </h3>
              </div>

              {/* 본문 전문 리더 */}
              <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>원문 본문 리더</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {rawUrl && (
                      <a
                        href={rawUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>원문 사이트 열기</span>
                      </a>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(articleContent, '본문 내용')}
                      className="h-6 text-[11px] px-2 rounded-md"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>복사</span>
                    </Button>
                  </div>
                </div>

                {/* InlineArticleRenderer 리치 리더 */}
                <div className="max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                  <InlineArticleRenderer
                    contentText={articleContent}
                    images={articleImages}
                    onOpenExternal={(url) => {
                      if (url) window.open(url, '_blank');
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. 모달 하단 원클릭 제작 액션 바 ── */}
        <div className="p-3 bg-muted/30 border-t border-border/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isSelected ? "default" : "outline"}
              onClick={() => onToggleSelect(sourceItem.id)}
              className={cn(
                "h-8 text-xs font-bold gap-1.5 rounded-xl cursor-pointer",
                isSelected && "bg-primary text-primary-foreground"
              )}
            >
              {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              <span>{isSelected ? "선택 해제" : "이 소스로 일괄 발주 선택"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onGoToScriptWriter && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onGoToScriptWriter(sourceItem);
                }}
                className="h-8 text-xs font-bold gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-xl"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>⚡ 숏폼 각색실로 보내기</span>
              </Button>
            )}

            {onGoToProEditor && isVideoOrScript && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onGoToProEditor(sourceItem);
                }}
                className="h-8 text-xs font-bold gap-1 rounded-xl"
              >
                <Scissors className="w-3.5 h-3.5 text-primary" />
                <span>✂️ Pro NLE 편집기 열기</span>
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-bold rounded-xl"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
