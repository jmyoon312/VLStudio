import React, { useState, useRef, useCallback } from 'react';
import { Upload, Film, X, Plus, FolderOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LocalVideoFile } from './videoCreativeTypes';

interface VideoDropZoneProps {
  files: LocalVideoFile[];
  onFilesChange: (files: LocalVideoFile[]) => void;
  onOpenLibraryModal: () => void;
  maxFiles?: number;
}

export const VideoDropZone: React.FC<VideoDropZoneProps> = ({
  files,
  onFilesChange,
  onOpenLibraryModal,
  maxFiles = 10,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback((rawFiles: FileList | File[]) => {
    const validExtensions = ['.mp4', '.mov', '.mkv', '.webm', '.avi'];
    const newLocalFiles: LocalVideoFile[] = [];

    Array.from(rawFiles).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        toast.error(`지원하지 않는 파일 형식입니다: ${file.name}`);
        return;
      }

      // Web file path fallback (Electron or File API)
      const nativePath = (file as any).path || (file as any).webkitRelativePath || file.name;
      const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));

      // 중복 체크
      if (files.some(f => f.filename === file.name && f.sizeMb === sizeMb)) {
        return;
      }

      newLocalFiles.push({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filename: file.name,
        filePath: nativePath,
        webUrl: URL.createObjectURL(file),
        sizeMb,
        durationSec: 15,
      });
    });

    if (newLocalFiles.length > 0) {
      const merged = [...files, ...newLocalFiles].slice(0, maxFiles);
      onFilesChange(merged);
      toast.success(`${newLocalFiles.length}개의 비디오가 등록되었습니다.`);
    }
  }, [files, maxFiles, onFilesChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so same file can be re-selected if removed
      e.target.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const handleClearAll = () => {
    onFilesChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/10 shadow-inner scale-[0.99]'
            : 'border-border/80 bg-background/60 hover:border-primary/60 hover:bg-accent/30'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-110">
          <Upload className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          동영상 파일을 여기로 끌어다 놓으세요 (드래그 & 드롭)
        </p>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          MP4, MOV, MKV, WebM 지원 (최대 {maxFiles}개) · 또는 클릭하여 컴퓨터에서 직접 선택
        </p>

        <div className="mt-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 gap-1.5 text-xs font-medium border-border/80"
          >
            <Plus className="h-3.5 w-3.5" />
            내 PC 파일 찾기
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenLibraryModal}
            className="h-8 gap-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            07_Downloads 보관함에서 선택
          </Button>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-primary" />
              매칭 준비된 로컬 영상 ({files.length}/{maxFiles}개)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              전체 비우기
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={file.id}
                className="group relative flex items-center justify-between rounded-md border border-border/60 bg-background/80 p-2 text-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 pr-6">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary/10 text-primary font-bold text-[10px]">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-xs" title={file.filename}>
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{file.sizeMb} MB</span>
                      {file.durationSec && (
                        <>
                          <span>·</span>
                          <span>약 {Math.round(file.durationSec)}초</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(file.id)}
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
