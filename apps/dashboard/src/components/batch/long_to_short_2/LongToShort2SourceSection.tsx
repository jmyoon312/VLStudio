import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Folder,
  Link,
  Upload,
  Film,
  CheckCircle2,
  Video,
  DownloadCloud,
  Sparkles,
  AlertCircle,
  Play,
  RotateCcw,
  Search,
  Loader2,
  FileVideo,
  MousePointerClick,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { VideoProbeResult } from '@/types/longToShort';
import { longToShortApi } from '@/services/longToShortApi';

export interface LibraryVideoItem {
  id: string;
  title: string;
  file_path: string;
  file_size_bytes: number;
  file_size_label: string;
  category: string;
  created_at: string;
  duration_label?: string;
}

interface LongToShort2SourceSectionProps {
  probeData: VideoProbeResult | null;
  onProbeComplete: (data: VideoProbeResult) => void;
  onClearSource: () => void;
  disabled?: boolean;
}

export const LongToShort2SourceSection: React.FC<LongToShort2SourceSectionProps> = ({
  probeData,
  onProbeComplete,
  onClearSource,
  disabled
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'library' | 'youtube' | 'local'>('library');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideoItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0); // 자식 요소 dragleave 오작동 방지

  // ── 1. 07_Downloads 보관함 실시간 로드 ───────────────────────────────────
  const fetchLibraryVideos = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const items = await longToShortApi.getLibraryVideos();
      setLibraryVideos(items);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '보관함 로드 실패',
        description: err.message || '07_Downloads 영상을 불러오지 못했습니다.'
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLibraryVideos();
  }, [fetchLibraryVideos]);

  // ── 2. 보관함 영상 선택 ──────────────────────────────────────────────────
  const handleSelectLibraryVideo = useCallback(async (item: LibraryVideoItem) => {
    if (isProbing || disabled) return;
    setIsProbing(true);
    try {
      const probeRes = await longToShortApi.probeVideo(item.file_path);
      onProbeComplete(probeRes);
      toast({
        title: '📁 영상 선택 완료',
        description: `'${item.title}' (${probeRes.duration_label}, ${probeRes.resolution_label})`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '영상 분석 실패',
        description: err.message || '비디오 파일을 분석하지 못했습니다.'
      });
    } finally {
      setIsProbing(false);
    }
  }, [isProbing, disabled, onProbeComplete, toast]);

  // ── 3. 파일 처리 공통 로직 (업로드 + 프로빙) ────────────────────────────
  const processVideoFile = useCallback(async (file: File) => {
    if (isUploading || isProbing || disabled) return;
    const validTypes = ['video/mp4', 'video/x-m4v', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/avi'];
    const isVideoByExt = /\.(mp4|m4v|mov|mkv|webm|avi|ts|flv)$/i.test(file.name);
    if (!validTypes.includes(file.type) && !isVideoByExt) {
      toast({ variant: 'destructive', title: '지원하지 않는 파일 형식', description: 'MP4, MOV, MKV, WebM 등 동영상 파일만 지원합니다.' });
      return;
    }
    setIsUploading(true);
    setIsProbing(true);
    try {
      toast({
        title: '📤 로컬 영상 업로드 중',
        description: `'${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)} MB) 처리 중...`
      });
      const probeRes = await longToShortApi.uploadLocalVideo(file);
      onProbeComplete(probeRes);
      toast({
        title: '✅ 비디오 업로드 및 프로빙 완료',
        description: `'${probeRes.file_name}' (${probeRes.duration_label}, ${probeRes.resolution_label})`
      });
      fetchLibraryVideos();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '업로드 실패',
        description: err.message || '파일을 업로드하지 못했습니다.'
      });
    } finally {
      setIsUploading(false);
      setIsProbing(false);
    }
  }, [isUploading, isProbing, disabled, onProbeComplete, toast, fetchLibraryVideos]);

  // ── 4. 파일 Input onChange ─────────────────────────────────────────────
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVideoFile(file);
    // input 값 초기화 → 같은 파일 재선택 가능
    if (e.target) e.target.value = '';
  }, [processVideoFile]);

  // ── 5. 드래그앤드롭 이벤트 (HTML5 DnD 100% 실체화) ────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processVideoFile(file);
  }, [processVideoFile]);

  // ── 6. 유튜브 다운로드 ──────────────────────────────────────────────────
  const handleDownloadYouTube = useCallback(async () => {
    if (!youtubeUrl.trim()) {
      toast({ variant: 'destructive', title: 'URL 입력 필요', description: '유튜브 영상 링크를 입력하세요.' });
      return;
    }
    setIsDownloading(true);
    try {
      toast({ title: '⬇️ 유튜브 고속 다운로드 시작', description: 'yt-dlp로 07_Downloads 저장소에 다운로드 중입니다...' });
      const dlRes = await longToShortApi.downloadYouTubeUrl(youtubeUrl);
      const probeRes = await longToShortApi.probeVideo(dlRes.video_path);
      onProbeComplete(probeRes);
      toast({ title: '🎉 유튜브 다운로드 완료', description: `'${probeRes.file_name}' (${probeRes.duration_label})` });
      setYoutubeUrl('');
      fetchLibraryVideos();
    } catch (err: any) {
      toast({ variant: 'destructive', title: '다운로드 실패', description: err.message || '유튜브 영상을 다운로드하지 못했습니다.' });
    } finally {
      setIsDownloading(false);
    }
  }, [youtubeUrl, onProbeComplete, toast, fetchLibraryVideos]);

  // ── 7. 유튜브 URL 입력 Enter 키 지원 ────────────────────────────────────
  const handleYoutubeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isDownloading) handleDownloadYouTube();
  }, [isDownloading, handleDownloadYouTube]);

  // ── 8. 검색 필터 ──────────────────────────────────────────────────────
  const filteredVideos = libraryVideos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <div
      id="long-to-short-source-section"
      className={cn(
        "bg-card border rounded-xl p-4 space-y-4 shadow-xs transition-all duration-200",
        isDragging
          ? "border-primary ring-2 ring-primary/40 bg-primary/5 scale-[1.005]"
          : "border-border"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 드래그 오버 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl bg-primary/10 backdrop-blur-[1px] pointer-events-none border-2 border-primary border-dashed">
          <Upload className="w-8 h-8 text-primary mb-2 animate-bounce" />
          <p className="text-sm font-bold text-primary">여기에 영상 파일을 드롭하세요</p>
          <p className="text-xs text-primary/70 mt-0.5">MP4 · MOV · MKV · WebM 지원</p>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          1단계: 원본 롱폼 영상 인입
        </span>
        {probeData ? (
          <button
            type="button"
            onClick={onClearSource}
            disabled={disabled}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-bold transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>다른 영상 선택하기</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30">
              영상 미선택
            </Badge>
            <span className="text-[10px] text-muted-foreground hidden sm:block">← 파일을 드래그해 놓거나 탭에서 선택</span>
          </div>
        )}
      </div>

      {/* 선택된 영상 요약 카드 */}
      {probeData ? (
        <div className="p-3.5 rounded-xl border-2 border-primary/40 bg-primary/5 space-y-2.5 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <h3 className="text-xs font-bold text-foreground truncate" title={probeData.file_name}>
                  {probeData.file_name}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground pl-5 font-mono">
                <span>길이: <strong className="text-foreground">{probeData.duration_label}</strong></span>
                <span>•</span>
                <span>해상도: <strong className="text-foreground">{probeData.resolution_label}</strong></span>
                <span>•</span>
                <span>코덱: <strong className="text-foreground">{probeData.video_codec.toUpperCase()}</strong></span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shrink-0">
              분석 준비 완료
            </Badge>
          </div>
          <div className="p-2 rounded-lg bg-background/80 border border-border/80 text-[11px] flex items-center justify-between">
            <span className="text-muted-foreground">권장 이야기 압축 쇼츠 수:</span>
            <span className="font-bold text-primary font-mono">
              {probeData.recommended_candidates}개 추천 (최대 {probeData.max_candidates}개)
            </span>
          </div>
        </div>
      ) : (
        /* 비디오 인입 3대 탭 */
        <div className="space-y-3">
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
            {(['library', 'youtube', 'local'] as const).map((tab) => {
              const icons = { library: Folder, youtube: Link, local: Upload };
              const labels = {
                library: `영상 보관함 (${libraryVideos.length})`,
                youtube: '유튜브 수집',
                local: '로컬 파일'
              };
              const Icon = icons[tab];
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-md font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                    activeTab === tab
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{labels[tab]}</span>
                </button>
              );
            })}
          </div>

          {/* 탭 1: 실제 영상 보관함 */}
          {activeTab === 'library' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="보관함 영상 제목 또는 폴더 검색..."
                    className="h-8 text-xs pl-8 font-medium"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={fetchLibraryVideos}
                  disabled={isLoadingLibrary}
                  className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
                  title="보관함 새로고침"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isLoadingLibrary && "animate-spin")} />
                </Button>
              </div>

              {isLoadingLibrary ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary" />
                  <p>07_Downloads 보관함 영상들을 검색하는 중...</p>
                </div>
              ) : filteredVideos.length > 0 ? (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredVideos.map(vid => (
                    <div
                      key={vid.id}
                      className={cn(
                        "p-2.5 rounded-lg border border-border hover:border-primary/60 hover:bg-primary/5 transition cursor-pointer flex items-center justify-between gap-2 text-xs group",
                        isProbing && "opacity-50 pointer-events-none"
                      )}
                      onClick={() => handleSelectLibraryVideo(vid)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectLibraryVideo(vid)}
                      aria-label={`영상 선택: ${vid.title}`}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition shrink-0">
                          <Play className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate max-w-[240px]" title={vid.title}>
                            {vid.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border font-mono">
                              {vid.category}
                            </Badge>
                            <span>{vid.file_size_label}</span>
                            <span>•</span>
                            <span className="font-mono">{vid.created_at}</span>
                          </div>
                        </div>
                      </div>
                      {/* 버튼 클릭 시 이벤트 버블링 차단 → 부모 onClick 중복 실행 방지 */}
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-[11px] font-bold shrink-0 shadow-2xs cursor-pointer"
                        onClick={e => { e.stopPropagation(); handleSelectLibraryVideo(vid); }}
                        disabled={isProbing}
                        type="button"
                      >
                        {isProbing ? <Loader2 className="w-3 h-3 animate-spin" /> : '선택'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                  <FileVideo className="w-6 h-6 mx-auto text-muted-foreground/60" />
                  <p className="font-bold text-foreground">07_Downloads에 영상이 없습니다</p>
                  <p className="text-[10.5px]">유튜브 수집 탭이나 로컬 파일 업로드로 영상을 추가해 보세요.</p>
                </div>
              )}
            </div>
          )}

          {/* 탭 2: 유튜브 수집 */}
          {activeTab === 'youtube' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  onKeyDown={handleYoutubeKeyDown}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={isDownloading || disabled}
                  className="text-xs h-9"
                />
                <Button
                  type="button"
                  onClick={handleDownloadYouTube}
                  disabled={isDownloading || disabled || !youtubeUrl.trim()}
                  className="h-9 px-3 text-xs font-bold shrink-0 gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
                  <span>{isDownloading ? '수집 중...' : '다운로드'}</span>
                </Button>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                yt-dlp를 통해 최고 화질로 07_Downloads 저장소에 고속 다운로드 후 자동 연결됩니다. (Enter 키로 바로 실행)
              </p>
            </div>
          )}

          {/* 탭 3: 로컬 파일 (드래그앤드롭 + 클릭) */}
          {activeTab === 'local' && (
            <div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all duration-200 text-xs space-y-2 cursor-pointer select-none",
                  isUploading
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/60 bg-muted/10 hover:bg-muted/30"
                )}
                onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && !isUploading && !disabled && fileInputRef.current?.click()}
                aria-label="비디오 파일 선택 또는 드래그앤드롭"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="font-bold text-foreground">서버로 비디오 업로드 및 분석 중...</span>
                    <span className="text-[10px] text-muted-foreground">잠시만 기다려 주세요.</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="font-bold text-foreground">클릭하거나 영상 파일을 드래그해 놓으세요</span>
                    <span className="text-[10.5px] text-muted-foreground">MP4, MOV, MKV, WebM 지원 (최대 4GB)</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" />
                        클릭 선택
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">또는</span>
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30 flex items-center gap-1">
                        <Upload className="w-3 h-3" />
                        드래그 드롭
                      </Badge>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-m4v,video/quicktime,video/x-matroska,video/webm,video/*"
                onChange={handleFileInput}
                disabled={isUploading || isProbing || disabled}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
