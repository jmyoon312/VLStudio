import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  UploadCloud,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Check,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getMediaUrl } from '@/lib/utils';
import { RankingCreationMode } from '@/types/ranking';
import { SourceItem } from '../tabs/OneTakeBatchTab';
import { formatViewsCount } from '../onetake/OneTakeSourceSection';

interface RankingSourceSectionProps {
  creationMode: RankingCreationMode;
  onChangeCreationMode: (mode: RankingCreationMode) => void;
  rankingTopic: string;
  onChangeRankingTopic: (topic: string) => void;
  rankingCriteria: string;
  onChangeRankingCriteria: (criteria: string) => void;
  targetCount: number;
  onChangeTargetCount: (cnt: number) => void;
  videoLibrary: SourceItem[];
  selectedVideo: SourceItem | null;
  onSelectVideo: (item: SourceItem) => void;
  multiVideoList: SourceItem[];
  onAddMultiVideo: (item: SourceItem) => void;
  onRemoveMultiVideo: (id: string) => void;
  onStartAnalyze: () => void;
  onStartGenerateScript: () => void;
  isAnalyzing: boolean;
}

export const RankingSourceSection: React.FC<RankingSourceSectionProps> = ({
  creationMode,
  onChangeCreationMode,
  rankingTopic,
  onChangeRankingTopic,
  rankingCriteria,
  onChangeRankingCriteria,
  targetCount,
  onChangeTargetCount,
  videoLibrary,
  selectedVideo,
  onSelectVideo,
  multiVideoList,
  onAddMultiVideo,
  onRemoveMultiVideo,
  onStartAnalyze,
  onStartGenerateScript,
  isAnalyzing
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  const filteredVideos = videoLibrary.filter(v =>
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isCriteriaValid = rankingCriteria.trim().length >= 3;

  return (
    <div className="space-y-4">
      {/* 1. 상단 모드 전환 탭 */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => onChangeCreationMode('single-video')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                creationMode === 'single-video'
                  ? "bg-card text-primary shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Film className="w-3.5 h-3.5" />
              한 영상에서 장면 고르기 (Single-Video)
            </button>
            <button
              type="button"
              onClick={() => onChangeCreationMode('multi-source')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5",
                creationMode === 'multi-source'
                  ? "bg-card text-primary shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              여러 영상 순위 만들기 (Multi-Source)
            </button>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">
          {creationMode === 'single-video' ? 'AI SCENE SLICER' : 'MULTI-CLIP SEQUENCER'}
        </Badge>
      </div>

      {/* 2. 랭킹 주제 및 순위 기준 인풋 바 */}
      <div className="p-3.5 bg-card border border-border rounded-xl space-y-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* 주제 인풋 (7칸) */}
          <div className="md:col-span-7">
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">
              랭킹 주제 제목
            </label>
            <input
              type="text"
              value={rankingTopic}
              onChange={e => onChangeRankingTopic(e.target.value)}
              placeholder="예: 세계에서 가장 빠른 슈퍼카 TOP 5"
              className="w-full text-xs p-2.5 rounded-lg border border-border bg-background font-bold text-foreground"
            />
          </div>

          {/* 순위 나눌 기준 인풋 (5칸) */}
          <div className="md:col-span-5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-muted-foreground">
                순위 나눌 기준 (최소 3자)
              </label>
              {!isCriteriaValid && rankingCriteria.length > 0 && (
                <span className="text-[10px] text-destructive flex items-center gap-0.5">
                  <AlertCircle className="w-2.5 h-2.5" />
                  3자 이상 입력
                </span>
              )}
            </div>
            <input
              type="text"
              value={rankingCriteria}
              onChange={e => onChangeRankingCriteria(e.target.value)}
              placeholder="예: 최고 시속 및 제로백 기록"
              className={cn(
                "w-full text-xs p-2.5 rounded-lg border bg-background font-semibold text-foreground",
                !isCriteriaValid && rankingCriteria.length > 0
                  ? "border-destructive/60"
                  : "border-border"
              )}
            />
          </div>
        </div>

        {/* 순위 개수 선택기 */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
          <span className="text-[11px] font-bold text-muted-foreground">목표 순위 개수</span>
          <div className="flex gap-1.5">
            {[3, 5, 7, 10].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => onChangeTargetCount(cnt)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-bold border transition cursor-pointer",
                  targetCount === cnt
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
              >
                TOP {cnt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 모드별 영상 소스 선택 그리드 */}
      {creationMode === 'single-video' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                분석할 원본 영상 선택 (보관함 07_Downloads)
              </span>
            </div>
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="영상 검색..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground"
              />
            </div>
          </div>

          {/* 비디오 카드 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
            {filteredVideos.map(video => {
              const isSelected = selectedVideo?.id === video.id;
              const isHovered = hoveredVideoId === video.id;
              const videoSrc = getMediaUrl(video.videoPath || video.sourceUrl || '');

              return (
                <div
                  key={video.id}
                  onClick={() => onSelectVideo(video)}
                  onMouseEnter={() => setHoveredVideoId(video.id)}
                  onMouseLeave={() => setHoveredVideoId(null)}
                  className={cn(
                    "group relative rounded-xl border overflow-hidden cursor-pointer transition flex flex-col justify-between bg-card",
                    isSelected
                      ? "border-primary ring-2 ring-primary/40 shadow-sm"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {/* 16:9 비디오 썸네일 박스 */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                    {isHovered && videoSrc ? (
                      <video
                        src={videoSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        <Film className="w-6 h-6 opacity-40" />
                      </div>
                    )}

                    {/* 좌상단 카테고리 태그 */}
                    {video.category && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {video.category}
                      </span>
                    )}

                    {/* 우하단 재생 시간 */}
                    {video.durationText && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono bg-black/70 text-white">
                        {video.durationText}
                      </span>
                    )}

                    {/* 좌하단 조회수 */}
                    {video.viewsCount !== undefined && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-black/70 text-amber-400">
                        {formatViewsCount(video.viewsCount)}
                      </span>
                    )}

                    {/* 우상단 선택 체크박스 */}
                    <div className="absolute top-1.5 right-1.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-black/40 border-white/40 text-transparent group-hover:border-white"
                        )}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* 하단 타이틀 */}
                  <div className="p-2">
                    <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                      {video.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI 분석 발주 버튼 */}
          <div className="pt-2">
            <Button
              type="button"
              disabled={!selectedVideo || !isCriteriaValid || isAnalyzing}
              onClick={onStartAnalyze}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isAnalyzing
                  ? 'AI 하이라이트 씬 분석 및 계획 수립 중...'
                  : selectedVideo
                  ? `[${selectedVideo.title.slice(0, 15)}...] 영상에서 TOP ${targetCount} 씬 찾아 계획 만들기`
                  : '먼저 분석할 영상을 1개 선택해 주세요'}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        /* Multi-Source 다중 영상 모드 */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              순위별 비디오/이미지 매칭 ({multiVideoList.length}/{targetCount}개)
            </span>
            <span className="text-[11px] text-muted-foreground">
              최소 3개 이상의 클립이 필요합니다
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
            {videoLibrary.map(video => {
              const isAdded = multiVideoList.some(m => m.id === video.id);
              return (
                <div
                  key={video.id}
                  onClick={() => isAdded ? onRemoveMultiVideo(video.id) : onAddMultiVideo(video)}
                  className={cn(
                    "p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between bg-card text-xs",
                    isAdded
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <p className="font-bold text-foreground line-clamp-2">{video.title}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                    <span className="text-[10px] text-muted-foreground">{video.category || '비디오'}</span>
                    <Badge variant={isAdded ? "default" : "outline"} className="text-[10px]">
                      {isAdded ? "포함됨" : "+ 추가"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              disabled={multiVideoList.length < 3 || !isCriteriaValid || isAnalyzing}
              onClick={onStartGenerateScript}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {multiVideoList.length >= 3
                  ? `선택한 ${multiVideoList.length}개 클립으로 TOP ${targetCount} 순위 대본 자동 구성`
                  : '클립을 최소 3개 이상 선택해 주세요'}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
