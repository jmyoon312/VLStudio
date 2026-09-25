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
import { Input } from '@/components/ui/input';
import { Search, Film, Clock, Check, Video, FolderOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SourceVideoItem {
  id: string;
  title: string;
  snippet?: string;
  sourceOrigin?: string;
  dateText?: string;
  video_path?: string;
  filePath?: string;
  stream_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  duration?: number;
  metadata?: any;
}

interface SourceVideoSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoList: SourceVideoItem[];
  onSelectVideo: (video: SourceVideoItem) => void;
  selectedIds?: string[];
}

export const SourceVideoSelectorModal: React.FC<SourceVideoSelectorModalProps> = ({
  open,
  onOpenChange,
  videoList = [],
  onSelectVideo,
  selectedIds = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = videoList.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.title.toLowerCase().includes(q) ||
      (v.sourceOrigin && v.sourceOrigin.toLowerCase().includes(q)) ||
      (v.snippet && v.snippet.toLowerCase().includes(q))
    );
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-card border-border p-5">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                바이럴루프 영상 보관함 (작품 선택)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                07_Downloads 및 채널 모니터링에서 수집된 영상 중 텍스트 창작 소스로 활용할 영상을 선택합니다.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-primary/10 text-primary border-primary/20">
              총 {videoList.length}개 보관
            </Badge>
          </div>

          {/* 검색 바 */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="영상 제목 또는 채널명으로 검색..."
              className="pl-9 h-9 text-xs bg-background border-border"
            />
          </div>
        </DialogHeader>

        {/* 영상 카드 그리드 */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-[50vh] pr-1">
          {filteredVideos.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground rounded-lg border border-dashed border-border">
              <Video className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-semibold">선택 가능한 영상이 없습니다.</p>
              <p className="text-[11px] mt-1 text-muted-foreground/70">
                바이럴 인텔리전스 센터 또는 채널 다운로드에서 영상을 먼저 수집하거나 로컬 파일을 직접 업로드하세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredVideos.map(video => {
                const isSelected = selectedIds.includes(video.id);
                const duration = video.duration_seconds || video.duration || 0;

                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      onSelectVideo(video);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'group relative rounded-lg border p-2.5 transition cursor-pointer flex flex-col justify-between shadow-2xs hover:border-primary/60 hover:shadow-xs',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/20 hover:bg-muted/40'
                    )}
                  >
                    <div>
                      {/* 상단 뱃지 및 메타 */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-background/80 text-muted-foreground font-mono truncate max-w-[120px]"
                        >
                          {video.sourceOrigin || '로컬 라이브러리'}
                        </Badge>
                        {duration > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(duration)}
                          </span>
                        )}
                      </div>

                      {/* 제목 */}
                      <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {video.title}
                      </h4>

                      {video.snippet && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-1">
                          {video.snippet}
                        </p>
                      )}
                    </div>

                    {/* 하단 선택 버튼 바 */}
                    <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">
                        {video.video_path ? video.video_path.split('\\').pop() : '영상 파일'}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="h-6 text-[10px] font-bold px-2 gap-1"
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>선택됨</span>
                          </>
                        ) : (
                          <span>선택</span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>원하는 영상을 클릭하면 즉시 소스로 추가됩니다.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
