import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Film, Check, Loader2, RefreshCw, FolderDown, Clock, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import { LocalVideoFile } from './videoCreativeTypes';

interface VideoLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelectVideos: (videos: LocalVideoFile[]) => void;
  alreadySelectedFiles: LocalVideoFile[];
}

export const VideoLibraryModal: React.FC<VideoLibraryModalProps> = ({
  open,
  onClose,
  onSelectVideos,
  alreadySelectedFiles,
}) => {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<LocalVideoFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/video-creative/library-videos?limit=100');
      if (!res.ok) throw new Error('비디오 목록 조회 실패');
      const data = await res.json();
      if (data.videos) {
        setVideos(data.videos);
      }
    } catch (err: any) {
      toast.error(`로컬 보관함 로드 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVideos();
      // 기존 선택된 파일들의 id 세팅
      const initIds = new Set(alreadySelectedFiles.map(f => f.id));
      setSelectedIds(initIds);
    }
  }, [open]);

  const filteredVideos = useMemo(() => {
    if (!searchTerm.trim()) return videos;
    const term = searchTerm.toLowerCase();
    return videos.filter(v => v.filename.toLowerCase().includes(term) || (v.filePath && v.filePath.toLowerCase().includes(term)));
  }, [videos, searchTerm]);

  const toggleSelect = (video: LocalVideoFile) => {
    const next = new Set(selectedIds);
    if (next.has(video.id)) {
      next.delete(video.id);
    } else {
      next.add(video.id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map(v => v.id)));
    }
  };

  const handleConfirm = () => {
    const chosen = videos.filter(v => selectedIds.has(v.id));
    onSelectVideos(chosen);
    toast.success(`${chosen.length}개의 비디오가 소스로 선택되었습니다.`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderDown className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                로컬 미디어 보관함 (07_Downloads / 05_Exports)
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchVideos}
              disabled={loading}
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            시스템 영구 저장소에 보관된 비디오 클립을 검색하여 영상 창작형 소스로 즉시 선택합니다.
          </DialogDescription>

          {/* Search bar & Select All */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="비디오 파일명 또는 경로 검색..."
                className="h-8 pl-8 text-xs bg-background/80 border-border/80"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 text-xs shrink-0 border-border/80"
            >
              {selectedIds.size === filteredVideos.length && filteredVideos.length > 0
                ? '선택 해제'
                : '전체 선택'}
            </Button>
          </div>
        </DialogHeader>

        {/* Video List Body */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">보관함 비디오를 스캔하고 있습니다...</p>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Film className="h-8 w-8 stroke-[1.5] text-muted-foreground/60" />
              <p className="text-sm font-medium">검색된 비디오가 없습니다.</p>
              <p className="text-xs text-muted-foreground/80">
                07_Downloads 디렉토리에 영상을 추가하거나 다른 검색어를 입력하세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredVideos.map((video) => {
                const isSelected = selectedIds.has(video.id);
                return (
                  <div
                    key={video.id}
                    onClick={() => toggleSelect(video)}
                    className={`group relative flex flex-col justify-between rounded-lg border p-3 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                        : 'border-border/70 bg-card/70 hover:border-primary/50 hover:bg-accent/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground text-xs" title={video.filename}>
                          {video.filename}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground mt-0.5" title={video.filePath}>
                          {video.filePath}
                        </p>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border/80 bg-background text-transparent group-hover:border-primary/60'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {video.sizeMb} MB
                      </span>
                      {video.durationSec && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Clock className="h-3 w-3 text-primary" />
                          {Math.round(video.durationSec)}초
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-card/60 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            선택됨: <span className="font-semibold text-primary">{selectedIds.size}</span>개 비디오
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs border-border/80"
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="h-8 text-xs gap-1.5 font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              선택한 영상 ({selectedIds.size}개) 적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
