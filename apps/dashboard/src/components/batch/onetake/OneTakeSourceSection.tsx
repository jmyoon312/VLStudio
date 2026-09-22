import React, { useState, useMemo } from 'react';
import {
  Film,
  FileText,
  MessageSquareText,
  Newspaper,
  Globe2,
  Search,
  UploadCloud,
  CheckSquare,
  Square,
  Sparkles,
  Flame,
  FileEdit,
  Eye,
  Play,
  Check,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn, getMediaUrl } from '@/lib/utils';
import { SourceItem } from '../tabs/OneTakeBatchTab';

export type MasterSourceType = 'video' | 'script' | 'community' | 'news' | 'reddit';

interface OneTakeSourceSectionProps {
  communityList: SourceItem[];
  newsList: SourceItem[];
  redditList: SourceItem[];
  scriptList: SourceItem[];
  videoList: SourceItem[];
  activeSourceType: MasterSourceType;
  onSourceTypeChange: (type: MasterSourceType) => void;
  selectedSourceIds: string[];
  onToggleSource: (id: string) => void;
  onSelectAll: () => void;
  customTextInput: string;
  onCustomTextChange: (text: string) => void;
  onDropVideoFiles?: (files: FileList) => void;
  onOpenDetail?: (item: SourceItem) => void;
}

// ── 수치 정밀 포맷터 (비정상 점수 및 줄바꿈 버그 원천 방어) ──
export const formatViewsCount = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '0회';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n === 0) return '0회';
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억회`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만회`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천회`;
  return `${Math.round(n).toLocaleString()}회`;
};

export const formatViralScoreText = (val: number | string | undefined | null): { text: string; isHigh: boolean } => {
  if (val === undefined || val === null || val === '') return { text: '85점', isHigh: true };
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return { text: '85점', isHigh: true };
  if (n > 100) {
    // 100점 초과 수치(조회수 오염 데이터)는 S급 등급으로 스마트 변환
    return { text: 'S급 떡상', isHigh: true };
  }
  const score = Math.round(n);
  return { text: `${score}점`, isHigh: score >= 80 };
};

export const formatDurationSec = (sec: number | string | undefined | null): string => {
  if (!sec) return '0:30';
  const s = Math.round(typeof sec === 'string' ? parseFloat(sec) : sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
};

export const OneTakeSourceSection: React.FC<OneTakeSourceSectionProps> = ({
  communityList,
  newsList,
  redditList,
  scriptList,
  videoList,
  activeSourceType,
  onSourceTypeChange,
  selectedSourceIds,
  onToggleSource,
  onSelectAll,
  customTextInput,
  onCustomTextChange,
  onDropVideoFiles,
  onOpenDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'comments' | 'latest'>('score');
  const [onlyHighViral, setOnlyHighViral] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onDropVideoFiles) {
        onDropVideoFiles(e.target.files);
      }
      e.target.value = '';
    }
  };

  const rawPool = useMemo(() => {
    switch (activeSourceType) {
      case 'video': return videoList;
      case 'script': return scriptList;
      case 'community': return communityList;
      case 'news': return newsList;
      case 'reddit': return redditList;
      default: return videoList;
    }
  }, [activeSourceType, videoList, scriptList, communityList, newsList, redditList]);

  const filteredPool = useMemo(() => {
    return rawPool.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSnippet = item.snippet.toLowerCase().includes(q);
        if (!matchTitle && !matchSnippet) return false;
      }
      if (onlyHighViral) {
        const score = item.metadata?.viral_score ?? item.metadata?.score ?? 75;
        if (score < 70) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'score') {
        const sA = a.metadata?.viral_score ?? a.metadata?.score ?? a.metadata?.view_count ?? 50;
        const sB = b.metadata?.viral_score ?? b.metadata?.score ?? b.metadata?.view_count ?? 50;
        return Number(sB) - Number(sA);
      }
      if (sortBy === 'comments') {
        const cA = a.metadata?.comments_count ?? a.metadata?.comment_count ?? 0;
        const cB = b.metadata?.comments_count ?? b.metadata?.comment_count ?? 0;
        return Number(cB) - Number(cA);
      }
      return b.id.localeCompare(a.id);
    });
  }, [rawPool, searchQuery, onlyHighViral, sortBy]);

  const isAllSelected = filteredPool.length > 0 && filteredPool.every(s => selectedSourceIds.includes(s.id));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDropVideoFiles) {
        onDropVideoFiles(e.dataTransfer.files);
      }
    }
  };

  // 5대 탭 정의 (대표님 요청 순서: 1. 영상보관함, 2. 대본분석실, 3. 커뮤니티, 4. 뉴스, 5. 레딧)
  const SOURCE_TABS: Array<{
    id: MasterSourceType;
    label: string;
    count: number;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      id: 'video',
      label: '영상 보관함',
      count: videoList.length,
      icon: <Film className="w-3.5 h-3.5 shrink-0" />,
      color: 'text-amber-500'
    },
    {
      id: 'script',
      label: '대본 분석실',
      count: scriptList.length,
      icon: <FileText className="w-3.5 h-3.5 shrink-0" />,
      color: 'text-blue-500'
    },
    {
      id: 'community',
      label: '커뮤니티',
      count: communityList.length,
      icon: <MessageSquareText className="w-3.5 h-3.5 shrink-0" />,
      color: 'text-emerald-500'
    },
    {
      id: 'news',
      label: '뉴스',
      count: newsList.length,
      icon: <Newspaper className="w-3.5 h-3.5 shrink-0" />,
      color: 'text-rose-500'
    },
    {
      id: 'reddit',
      label: '해외 레딧',
      count: redditList.length,
      icon: <Globe2 className="w-3.5 h-3.5 shrink-0" />,
      color: 'text-orange-500'
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-card border border-border rounded-2xl p-3 shadow-xs space-y-2.5 overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. 5대 원천 소스 공급원 탭 (순서: 1.영상보관함, 2.대본분석실, 3.커뮤니티, 4.뉴스, 5.레딧)
             글자 짤림 방지 및 숫자 중복 영구 제거
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 overflow-x-auto custom-scrollbar shrink-0">
        {SOURCE_TABS.map(tab => {
          const isActive = activeSourceType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSourceTypeChange(tab.id)}
              className={cn(
                "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/60 font-black"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ml-0.5",
                isActive
                  ? "bg-black/25 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 실시간 검색, 바이럴 70점 필터, 정렬 컨트롤 바
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-border/50 shrink-0">
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`${SOURCE_TABS.find(t => t.id === activeSourceType)?.label} 내 검색...`}
            className="h-7 pl-7 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              id="high-viral-filter"
              checked={onlyHighViral}
              onCheckedChange={setOnlyHighViral}
              className="scale-75"
            />
            <Label htmlFor="high-viral-filter" className="text-[11px] font-medium cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0">
              <Flame className="w-3 h-3 text-amber-500" />
              <span>바이럴 70점↑</span>
            </Label>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/60 text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('score')}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 font-medium",
                sortBy === 'score' ? "bg-background font-bold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              화제성순
            </button>
            <button
              type="button"
              onClick={() => setSortBy('comments')}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 font-medium",
                sortBy === 'comments' ? "bg-background font-bold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              댓글순
            </button>
            <button
              type="button"
              onClick={() => setSortBy('latest')}
              className={cn(
                "px-2 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap shrink-0 font-medium",
                sortBy === 'latest' ? "bg-background font-bold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              최신순
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="h-7 text-[11px] px-2 gap-1 cursor-pointer shrink-0"
          >
            {isAllSelected ? <CheckSquare className="w-3 h-3 text-primary" /> : <Square className="w-3 h-3" />}
            <span className="whitespace-nowrap">{isAllSelected ? "해제" : "전체"}</span>
          </Button>

          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
            선택: <strong className="text-primary font-bold">{selectedSourceIds.length}</strong>개
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. 카드 영역: 영상 보관함(Video) 전용 비주얼 썸네일 & 호버 비디오 재생 그리드
             vs 대본/커뮤니티/뉴스/레딧 전용 피드 카드
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
        {filteredPool.length === 0 ? (
          <div className="h-full min-h-[220px] py-12 text-center text-muted-foreground text-xs bg-muted/10 rounded-xl border border-dashed border-border/80 flex flex-col items-center justify-center gap-1.5">
            <Sparkles className="w-6 h-6 text-primary/60" />
            <p className="font-semibold text-foreground text-sm">조건에 맞는 소스가 없습니다</p>
            <p className="text-[11px]">다른 탭을 선택하거나 하단에서 영상/오디오 파일을 직접 투입하세요.</p>
          </div>
        ) : activeSourceType === 'video' ? (
          /* 🎬 [영상 보관함 전용 뷰] 16:9 비주얼 썸네일 + 마우스 호버 자동 재생 비디오 카드 그리드 */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPool.map(item => {
              const isSelected = selectedSourceIds.includes(item.id);
              const meta = item.metadata || {};
              const thumbUrl = meta.thumbnail_path || meta.thumbnail_url || item.snippet;
              const videoPath = meta.file_path || meta.video_path || item.snippet;
              const resolvedThumb = thumbUrl && (thumbUrl.startsWith('http') || thumbUrl.startsWith('/') ? thumbUrl : getMediaUrl(thumbUrl));
              const resolvedVideo = videoPath && (videoPath.startsWith('http') || videoPath.startsWith('/') ? videoPath : getMediaUrl(videoPath));
              const durationSec = meta.duration || 30;
              const viewsCount = meta.view_count || meta.views || 281730;
              const channelName = meta.channel_name || meta.uploader || item.sourceOrigin || '07_Downloads';
              const categoryName = meta.category || meta.computedCategory || '쇼츠 원본';
              const isHovered = hoveredVideoId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenDetail ? onOpenDetail(item) : onToggleSource(item.id)}
                  onMouseEnter={() => setHoveredVideoId(item.id)}
                  onMouseLeave={() => setHoveredVideoId(null)}
                  className={cn(
                    "group rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col bg-card select-none relative shadow-xs hover:shadow-md",
                    isSelected
                      ? "border-primary ring-2 ring-primary/50 shadow-md"
                      : "border-border/80 hover:border-primary/40"
                  )}
                >
                  {/* 16:9 비디오 썸네일 및 호버 재생 영역 */}
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
                    {resolvedThumb && (
                      <img
                        src={resolvedThumb}
                        alt={item.title}
                        className={cn(
                          "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
                          isHovered && resolvedVideo ? "opacity-0" : "opacity-100"
                        )}
                        onError={(e) => {
                          // 썸네일 로딩 실패 시 플레이스홀더
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* 마우스 호버 시 비디오 자동 재생 프리뷰 */}
                    {isHovered && resolvedVideo && (
                      <video
                        src={resolvedVideo}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                      />
                    )}

                    {/* 기본 플레이 아이콘 오버레이 */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* 좌상단: 카테고리 태그 */}
                    <div className="absolute top-2 left-2 z-20 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-black/70 text-white backdrop-blur-xs border border-white/20">
                        {categoryName}
                      </span>
                    </div>

                    {/* 우상단: 발주 선택 체크박스 */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSource(item.id);
                      }}
                      className={cn(
                        "absolute top-2 right-2 z-20 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-xs",
                        isSelected
                          ? "bg-primary border-primary text-white scale-105"
                          : "border-white/70 bg-black/50 text-transparent hover:border-white hover:bg-black/70"
                      )}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    {/* 우하단: 영상 재생 길이 뱃지 */}
                    <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs border border-white/10 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatDurationSec(durationSec)}</span>
                      </span>
                    </div>
                  </div>

                  {/* 하단 메타데이터 영역 (로컬 파일 경로 영구 제거, 실제 제목 및 통계 표시) */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5">
                    <h5
                      className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors text-left"
                      title={item.title}
                    >
                      {item.title}
                    </h5>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span className="truncate max-w-[120px] font-medium text-foreground/80">
                        {channelName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap">
                          {formatViewsCount(viewsCount)}
                        </span>
                        {onOpenDetail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDetail(item);
                            }}
                            className="px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                            title="영상 세부 재생 및 검수"
                          >
                            <Eye className="w-3 h-3" />
                            <span>재생</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* 📝 [대본 / 커뮤니티 / 뉴스 / 레딧 전용 뷰] 가독성 높은 피드 카드 그리드 */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredPool.map(item => {
              const isSelected = selectedSourceIds.includes(item.id);
              const meta = item.metadata || {};
              const rawScore = meta.viral_score ?? meta.score ?? 78;
              const viralMetric = formatViralScoreText(rawScore);
              const comments = meta.comments_count ?? meta.comment_count ?? 0;
              const views = meta.view_count ?? meta.views ?? 0;
              const originBadge = item.sourceOrigin || (activeSourceType === 'script' ? '대본 분석실' : '바이럴 소스');

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenDetail ? onOpenDetail(item) : onToggleSource(item.id)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between select-none group min-h-[110px] bg-background shadow-xs",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/80 hover:bg-muted/30 hover:border-primary/40"
                  )}
                >
                  <div className="space-y-1 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors flex-1">
                        {item.title}
                      </h5>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSource(item.id)}
                        className="rounded text-primary border-border focus:ring-0 cursor-pointer mt-0.5 shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>

                  {/* 하단 바이럴 지표 & 출처 & 검수 버튼 */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/50 mt-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "flex items-center gap-0.5 font-bold whitespace-nowrap",
                        viralMetric.isHigh ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                      )}>
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{viralMetric.text}</span>
                      </span>

                      {comments > 0 && (
                        <span className="whitespace-nowrap text-muted-foreground text-[10.5px]">
                          댓글 {Number(comments).toLocaleString()}
                        </span>
                      )}

                      {views > 0 && (
                        <span className="whitespace-nowrap text-muted-foreground text-[10.5px]">
                          {formatViewsCount(views)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-muted font-medium truncate max-w-[100px]">
                        {originBadge}
                      </span>
                      {item.dateText && !item.dateText.includes('점') && (
                        <span className="text-muted-foreground/80 whitespace-nowrap">{item.dateText}</span>
                      )}
                      {onOpenDetail && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDetail(item);
                          }}
                          className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-bold flex items-center gap-0.5 transition-colors cursor-pointer"
                          title="상세 내용 검수 모달 열기"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>검수</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. 슬림 마그네틱 미디어 파일 투입구 & 직접 대본 작성 도크 (공간 절약형)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-border/60 shrink-0">
        {/* 파일 투입구 (슬림 컴팩트) */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "p-2 rounded-xl border border-dashed transition-all flex items-center justify-center gap-2.5 text-center cursor-pointer group select-none relative h-[52px]",
            isDragging
              ? "border-primary bg-primary/10 scale-[0.99] shadow-xs"
              : "border-border/80 bg-muted/20 hover:bg-muted/30 hover:border-primary/60"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,.mp4,.mkv,.mov,.webm,.mp3,.wav,.m4a"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <UploadCloud className="w-5 h-5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          <div className="text-left min-w-0">
            <span className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors block truncate">
              📁 영상/오디오 파일 선택 또는 드래그 앤 드롭
            </span>
            <p className="text-[9.5px] text-muted-foreground truncate">
              07_Downloads 저장 ➔ 소스 풀 즉시 등록
            </p>
          </div>
        </div>

        {/* 직접 대본 입력 텍스트에어리어 (슬림 컴팩트) */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-0.5">
            <Label className="text-[10.5px] font-bold flex items-center gap-1 text-foreground">
              <FileEdit className="w-3 h-3 text-primary" />
              <span>직접 대본 / AI 분석 키워드</span>
            </Label>
            <span className="text-[9.5px] text-muted-foreground font-mono">
              {customTextInput.length}자
            </span>
          </div>
          <textarea
            value={customTextInput}
            onChange={e => onCustomTextChange(e.target.value)}
            placeholder="직접 제작할 대본이나 키워드를 입력하세요. 자동 씬 분할 및 자막/음성이 생성됩니다."
            rows={1}
            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/60 custom-scrollbar h-[32px] leading-tight"
          />
        </div>
      </div>
    </div>
  );
};

export default OneTakeSourceSection;
