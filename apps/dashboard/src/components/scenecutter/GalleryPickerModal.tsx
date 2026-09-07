import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderOpen, Search, Film, Check, Play, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface VideoItem {
  id: number;
  title: string;
  file_path: string;
  thumbnail_path?: string;
  duration?: number;
  view_count?: number;
  viralGrade?: string;
  metadata_json?: any;
}

interface GalleryPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideos: (videos: VideoItem[]) => void;
}

export const GalleryPickerModal: React.FC<GalleryPickerModalProps> = ({
  open,
  onOpenChange,
  onSelectVideos,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 수집 영상 목록 조회
  const { data: videos = [], isLoading } = useQuery<VideoItem[]>({
    queryKey: ['galleryVideos_for_picker'],
    queryFn: async () => {
      const res = await api.get('/videos/');
      return res.data || [];
    },
    enabled: open,
  });

  const filteredVideos = videos.filter((v) =>
    v.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const handleConfirm = () => {
    const selected = videos.filter((v) => selectedIds.has(v.id));
    onSelectVideos(selected);
    onOpenChange(false);
    setSelectedIds(new Set());
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card text-card-foreground border-border shadow-2xl p-6 rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="space-y-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <FolderOpen className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              수집 영상 보관함에서 대기열로 담기
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            이미 수집·다운로드된 바이럴 영상을 선택하여 AI 씬 분석 대기열에 한 번에 등록합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 검색 및 일괄 선택 바 */}
        <div className="flex items-center justify-between gap-3 py-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="영상 제목 검색..."
              className="pl-8 h-9 text-xs bg-background border-border rounded-xl"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="h-9 text-xs rounded-xl font-bold shrink-0"
          >
            {selectedIds.size === filteredVideos.length && filteredVideos.length > 0
              ? '선택 해제'
              : `전체 선택 (${filteredVideos.length})`}
          </Button>
        </div>

        {/* 영상 그리드 목록 */}
        <div className="flex-1 min-h-[300px] border border-border rounded-xl bg-muted/20 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-muted-foreground py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">보관함 영상을 불러오는 중...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-muted-foreground py-16">
              <Film className="w-8 h-8 opacity-30" />
              <p className="text-xs">조건에 맞는 수집 영상이 없습니다.</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredVideos.map((video) => {
                  const isSelected = selectedIds.has(video.id);
                  return (
                    <div
                      key={video.id}
                      onClick={() => toggleSelect(video.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(video.id)}
                        className="rounded-md"
                      />

                      <div className="w-16 h-12 rounded-lg bg-muted overflow-hidden shrink-0 relative flex items-center justify-center">
                        {video.thumbnail_path ? (
                          <img
                            src={video.thumbnail_path}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-5 h-5 text-muted-foreground/40" />
                        )}
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 text-[9px] font-bold bg-black/70 text-white rounded">
                            {formatDuration(video.duration)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate" title={video.title}>
                          {video.title}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {video.viralGrade && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-500">
                              {video.viralGrade}급
                            </Badge>
                          )}
                          <span className="truncate">
                            조회수: {video.view_count?.toLocaleString() || 0}회
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between pt-3 border-t border-border shrink-0">
          <span className="text-xs font-bold text-muted-foreground">
            선택된 영상: <b className="text-primary">{selectedIds.size}</b>개
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              <span>대기열에 담기 ({selectedIds.size})</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
