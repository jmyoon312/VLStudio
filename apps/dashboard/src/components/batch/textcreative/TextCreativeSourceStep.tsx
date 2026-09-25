import React, { useRef, useState } from 'react';
import {
  Link as LinkIcon,
  UploadCloud,
  FileVideo,
  X,
  Sparkles,
  CheckCircle2,
  Film,
  FolderOpen,
  Scan,
  Zap,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { parseDraftLinks } from './textCreativeUtils';
import {
  SourceVideoSelectorModal,
  SourceVideoItem
} from './SourceVideoSelectorModal';
import { cn } from '@/lib/utils';

interface TextCreativeSourceStepProps {
  linksText: string;
  onLinksTextChange: (val: string) => void;
  sourceFiles: File[];
  onSourceFilesChange: (files: File[]) => void;
  focusPersons: string[];
  onFocusPersonsChange: (persons: string[]) => void;
  sourceMode: 'short-to-short' | 'long-to-short';

  // [NEW] 바이럴루프 보관함 영상 목록 및 선택 핸들러
  videoList?: SourceVideoItem[];
  selectedLibraryVideos?: SourceVideoItem[];
  onSelectLibraryVideo?: (video: SourceVideoItem) => void;
  onRemoveLibraryVideo?: (id: string) => void;

  // [NEW] 작품 분석 트리거 핸들러
  onAnalyzeSources?: () => void;
  isAnalyzingSources?: boolean;
  analyzedManifestSnippet?: string;
}

export const TextCreativeSourceStep: React.FC<TextCreativeSourceStepProps> = ({
  linksText,
  onLinksTextChange,
  sourceFiles,
  onSourceFilesChange,
  focusPersons,
  onFocusPersonsChange,
  sourceMode,
  videoList = [],
  selectedLibraryVideos = [],
  onSelectLibraryVideo,
  onRemoveLibraryVideo,
  onAnalyzeSources,
  isAnalyzingSources = false,
  analyzedManifestSnippet
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);

  const parsedLinks = parseDraftLinks(linksText);
  const totalSourceCount =
    parsedLinks.length + sourceFiles.length + selectedLibraryVideos.length;

  // 파일 드롭 핸들러 (버블링 방지 및 시각 피드백)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f =>
        f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)
      );
      if (newFiles.length > 0) {
        onSourceFilesChange([...sourceFiles, ...newFiles]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      onSourceFilesChange([...sourceFiles, ...newFiles]);
      // reset file input value to allow selecting same file again if needed
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    onSourceFilesChange(sourceFiles.filter((_, i) => i !== index));
  };

  return (
    <section
      id="tc-step-source"
      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs"
    >
      {/* 파일 인풋을 컨테이너 외부(숨김)로 완벽 격리하여 버블링 루프 원천 차단 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mp4,.mov,.avi,.mkv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 상단 스텝 라벨 및 툴바 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded border border-border bg-muted/40 font-mono font-bold text-xs text-foreground">
            02
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <UploadCloud className="w-3.5 h-3.5 text-primary" />
              영상 소스 (SOURCE)
            </h3>
            <p className="text-[10px] text-muted-foreground">
              링크 {parsedLinks.length}개 · 파일 {sourceFiles.length}개 · 보관함 {selectedLibraryVideos.length}개 감지됨
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 바이럴루프 영상 보관함 모달 오픈 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLibraryModalOpen(true)}
            className="h-7 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>바이럴루프 보관함에서 선택</span>
          </Button>

          {/* 소스 준비 완료 뱃지 */}
          {totalSourceCount > 0 && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-[11px] font-bold gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              소스 준비 완료
            </Badge>
          )}
        </div>
      </div>

      {/* 좌우 2컬럼: 링크 붙여넣기 vs 로컬 비디오 파일 드롭존 */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* 좌측: URL 링크 입력 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <LinkIcon className="w-3 h-3 text-primary" />
              영상 링크 붙여넣기
            </label>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-bold',
                parsedLinks.length > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {parsedLinks.length}개 링크
            </span>
          </div>

          <Textarea
            value={linksText}
            onChange={e => onLinksTextChange(e.target.value)}
            placeholder={
              sourceMode === 'long-to-short'
                ? '유튜브 롱폼 URL 하나를 입력하세요 (예: https://www.youtube.com/watch?v=...)'
                : '유튜브 쇼츠, 인스타그램 릴스, 틱톡 링크를 여러 줄로 붙여넣으세요:\nhttps://www.youtube.com/shorts/...\nhttps://www.instagram.com/reel/...'
            }
            className="min-h-[7.5rem] resize-y text-xs font-mono bg-background border-border"
          />
        </div>

        {/* 우측: 로컬 파일 드롭존 (완전한 드래그 앤 드롭 및 클릭 안정성) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileVideo className="w-3 h-3 text-primary" />
              로컬 영상 파일 첨부
            </label>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums font-bold',
                sourceFiles.length > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {sourceFiles.length}개 파일
            </span>
          </div>

          <div
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center min-h-[7.5rem] rounded-lg border-2 border-dashed p-3 text-center transition cursor-pointer',
              isDragging
                ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                : 'border-border/80 hover:border-primary/60 bg-muted/10 hover:bg-muted/20'
            )}
          >
            <UploadCloud
              className={cn(
                'w-6 h-6 mb-1 transition-colors',
                isDragging ? 'text-primary animate-bounce' : 'text-muted-foreground'
              )}
            />
            <p className="text-xs font-semibold text-foreground">
              {isDragging ? '여기에 영상을 놓으세요!' : '클릭하여 영상 파일 선택 또는 파일 드롭'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              MP4, MOV 등 최대 20개 영상 동시 배치 지원
            </p>
          </div>
        </div>
      </div>

      {/* 등록된 영상 소스 목록 (픽셀링 data-pixi-text-creative-source-list 카드 규격 복원) */}
      {(sourceFiles.length > 0 || selectedLibraryVideos.length > 0) && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">
              등록된 영상 소스 ({sourceFiles.length + selectedLibraryVideos.length}개)
            </span>

            {/* 영상 작품 AI 심층 분석 액션 버튼 */}
            {onAnalyzeSources && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isAnalyzingSources}
                onClick={onAnalyzeSources}
                className="h-6 text-[10px] font-bold px-2.5 gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{isAnalyzingSources ? '영상 씬 컷 심층 분석 중...' : '⚡ 영상 작품 AI 심층 분석'}</span>
              </Button>
            )}
          </div>

          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
            data-pixi-text-creative-source-list="true"
          >
            {/* 1. 보관함 선택 영상 카드들 */}
            {selectedLibraryVideos.map(video => (
              <div
                key={`lib-${video.id}`}
                className="group relative rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-1 shadow-2xs hover:border-primary/60 transition"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] bg-background text-primary border-primary/30">
                    보관함 영상
                  </Badge>
                  {onRemoveLibraryVideo && (
                    <button
                      type="button"
                      onClick={() => onRemoveLibraryVideo(video.id)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <h5 className="text-[11px] font-bold text-foreground truncate" title={video.title}>
                  {video.title}
                </h5>
                <p className="text-[9px] text-muted-foreground truncate font-mono">
                  {video.sourceOrigin || '07_Downloads'}
                </p>
              </div>
            ))}

            {/* 2. 로컬 업로드 파일 카드들 */}
            {sourceFiles.map((file, idx) => (
              <div
                key={`file-${idx}`}
                className="group relative rounded-lg border border-border bg-muted/20 p-2 space-y-1 shadow-2xs hover:border-primary/60 transition"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] bg-background text-muted-foreground border-border">
                    로컬 파일
                  </Badge>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-muted-foreground hover:text-destructive cursor-pointer p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <h5 className="text-[11px] font-bold text-foreground truncate" title={file.name}>
                  {file.name}
                </h5>
                <p className="text-[9px] text-muted-foreground font-mono">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            ))}
          </div>

          {/* 분석 완료된 비디오 매니페스트 요약 표시 */}
          {analyzedManifestSnippet && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <span className="font-bold text-primary flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                작품 시각 내러티브 메타데이터 추출 완료
              </span>
              <p className="font-mono text-[10px] line-clamp-2 text-foreground/80">
                {analyzedManifestSnippet}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 보관함 영상 선택 모달 */}
      <SourceVideoSelectorModal
        open={libraryModalOpen}
        onOpenChange={setLibraryModalOpen}
        videoList={videoList}
        selectedIds={selectedLibraryVideos.map(v => v.id)}
        onSelectVideo={video => {
          if (onSelectLibraryVideo) {
            onSelectLibraryVideo(video);
          }
        }}
      />
    </section>
  );
};
