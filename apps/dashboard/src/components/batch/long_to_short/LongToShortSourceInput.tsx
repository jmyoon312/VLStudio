import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Link,
  Film,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Video,
  Layers,
  Sparkles,
  DownloadCloud,
  FolderOpen,
  Search,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { VideoProbeResult, LibraryVideo, SourceInputMode } from '@/types/longToShort';
import { longToShortApi } from '@/services/longToShortApi';

interface LongToShortSourceInputProps {
  probeData: VideoProbeResult | null;
  onProbeComplete: (data: VideoProbeResult) => void;
  onClearSource: () => void;
  disabled?: boolean;
}

export const LongToShortSourceInput: React.FC<LongToShortSourceInputProps> = ({
  probeData,
  onProbeComplete,
  onClearSource,
  disabled
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<SourceInputMode>('local');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // 07_Downloads 보관함 상태
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [librarySearch, setLibrarySearch] = useState<string>('');

  // 보관함 비디오 목록 로드
  const loadLibraryVideos = async () => {
    setIsLoadingLibrary(true);
    try {
      const vids = await longToShortApi.getLibraryVideos();
      setLibraryVideos(vids);
    } catch (err: any) {
      console.warn('보관함 비디오 로드 실패:', err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (inputMode === 'library' && libraryVideos.length === 0) {
      loadLibraryVideos();
    }
  }, [inputMode]);

  // 공통 파일 프로빙 처리 (드래그앤드롭 & 파일 선택 공용)
  const processFile = async (file: File) => {
    setIsProbing(true);
    try {
      const electronPath = (file as any).path as string | undefined;
      const isLocalAbsolute = Boolean(
        electronPath &&
        electronPath.length > 3 &&
        (electronPath.includes('/') || electronPath.includes('\\'))
      );

      if (isLocalAbsolute) {
        // ✅ Electron 데스크톱 환경: 로컬 파일 절대 경로로 초고속 FFprobe 분석
        const res = await longToShortApi.probeVideo(electronPath!);
        onProbeComplete(res);
        toast({
          title: '✅ 롱폼 비디오 로드 완료',
          description: `'${file.name}' (${res.duration_label}, ${res.resolution_label}) 분석 준비 완료.`
        });
      } else {
        // ✅ 웹 브라우저 환경: 서버 업로드 후 FFprobe 자동 분석
        toast({
          title: '⬆️ 비디오 파일 전송 중...',
          description: `'${file.name}'을 로컬 서버로 업로드하여 분석합니다.`
        });
        const res = await longToShortApi.uploadLocalVideo(file);
        onProbeComplete(res);
        toast({
          title: '✅ 롱폼 비디오 로드 완료',
          description: `'${file.name}' (${res.duration_label}, ${res.resolution_label}) 분석 준비 완료.`
        });
      }
    } catch (err: any) {
      console.error('File probe/upload failed:', err);
      toast({
        variant: 'destructive',
        title: '비디오 분석 실패',
        description: err.message || '영상 파일을 읽는 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsProbing(false);
    }
  };

  // 1. 파일 input 변경 이벤트
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // 동일 파일 재선택 허용
    e.target.value = '';
  };

  // 2. 드래그앤드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isProbing) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (disabled || isProbing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // 비디오 파일 확장자 검사
      const validExts = ['.mp4', '.mov', '.mkv', '.webm', '.avi', '.ts'];
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!validExts.includes(ext) && !file.type.startsWith('video/')) {
        toast({
          variant: 'destructive',
          title: '비디오 파일 형식 오류',
          description: 'MP4, MOV, MKV, WebM 형식의 동영상 파일만 지원됩니다.'
        });
        return;
      }
      processFile(file);
    }
  };

  // 3. 유튜브 URL 다운로드 처리
  const handleDownloadYouTube = async () => {
    if (!youtubeUrl.trim()) {
      toast({ variant: 'destructive', title: 'URL 입력 필요', description: '유튜브 영상 링크를 입력하세요.' });
      return;
    }

    setIsDownloading(true);
    try {
      toast({
        title: '⬇️ 유튜브 고속 다운로드 시작',
        description: 'yt-dlp로 07_Downloads 저장소에 고화질 영상을 다운로드 중입니다...'
      });

      const dlRes = await longToShortApi.downloadYouTubeUrl(youtubeUrl);
      const probeRes = await longToShortApi.probeVideo(dlRes.video_path);
      onProbeComplete(probeRes);

      toast({
        title: '🎉 유튜브 롱폼 다운로드 완료',
        description: `'${dlRes.video_title}' (${probeRes.duration_label}) 등록 완료.`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '다운로드 실패',
        description: err.message || '유튜브 영상 다운로드 중 오류가 발생했습니다.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // 4. 07_Downloads 보관함에서 비디오 선택
  const handleSelectLibraryVideo = async (vid: LibraryVideo) => {
    setIsProbing(true);
    try {
      const probeRes = await longToShortApi.probeVideo(vid.file_path);
      onProbeComplete(probeRes);
      toast({
        title: '✅ 보관함 영상 로드 완료',
        description: `'${vid.title}' (${probeRes.duration_label}) 등록 완료.`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '보관함 영상 분석 실패',
        description: err.message || '영상 파일 정보를 불러오지 못했습니다.'
      });
    } finally {
      setIsProbing(false);
    }
  };

  // 보관함 검색 필터링
  const filteredLibraryVideos = libraryVideos.filter(v =>
    v.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
    v.category.toLowerCase().includes(librarySearch.toLowerCase())
  );

  return (
    <div className="space-y-3.5">
      {/* 상단 헤더: 타이틀 & VMI 엔진 뱃지 */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          롱폼 원본 소스 인입
        </span>
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
          VMI 3-TENSOR
        </Badge>
      </div>

      {/* 등록된 비디오가 있는 경우: 메타데이터 인스펙터 카드 */}
      {probeData ? (
        <div className="p-3.5 rounded-xl border border-primary/40 bg-primary/5 space-y-3 shadow-2xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground truncate block" title={probeData.file_name}>
                {probeData.file_name}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {(probeData.file_size_bytes / (1024 * 1024)).toFixed(1)} MB · {probeData.video_path}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearSource}
              disabled={disabled}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              소스 교체
            </Button>
          </div>

          {/* 메타데이터 지표 뱃지 3열 그리드 */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">영상 길이</span>
              <strong className="text-[11px] font-mono text-primary font-bold">{probeData.duration_label}</strong>
            </div>
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">해상도</span>
              <strong className="text-[11px] font-mono text-foreground font-bold">{probeData.resolution_label}</strong>
            </div>
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">코덱 규격</span>
              <strong className="text-[11px] font-mono text-foreground uppercase font-bold">
                {probeData.video_codec} / {probeData.audio_codec}
              </strong>
            </div>
          </div>

          {/* 비호환 코덱 경고 */}
          {probeData.warning && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{probeData.warning}</span>
            </div>
          )}

          {/* AI 추천 후보 안내 */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              추천 후보 수: <strong className="text-primary font-bold">{probeData.recommended_candidates}개</strong>
            </span>
            <span>중복 없이 최대 {probeData.max_candidates}개 추출 가능</span>
          </div>
        </div>
      ) : (
        /* 소스 미등록 상태: 3대 탭 소스 인입 */
        <div className="space-y-2.5">
          {/* 3대 소스 선택 탭 세그먼트 */}
          <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-muted/50 border border-border text-xs">
            <button
              type="button"
              onClick={() => setInputMode('local')}
              className={cn(
                "py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px]",
                inputMode === 'local'
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>로컬 파일</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('youtube')}
              className={cn(
                "py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px]",
                inputMode === 'youtube'
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link className="w-3.5 h-3.5" />
              <span>유튜브 URL</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('library')}
              className={cn(
                "py-1.5 rounded-md font-bold transition flex items-center justify-center gap-1 cursor-pointer text-[11px]",
                inputMode === 'library'
                  ? "bg-card text-primary shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>07_보관함</span>
            </button>
          </div>

          {/* 1. 로컬 파일 드래그앤드롭 인풋 영역 */}
          {inputMode === 'local' && (
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isProbing && !disabled && fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2.5 p-5 rounded-xl border-2 border-dashed transition cursor-pointer text-center select-none",
                isDraggingOver
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border/80 bg-muted/15 hover:bg-muted/30 hover:border-primary/50",
                isProbing && "opacity-60 pointer-events-none"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.mkv,.webm,.avi"
                onChange={handleFileInputChange}
                disabled={disabled || isProbing}
                className="hidden"
              />

              <div className="p-3 rounded-full bg-primary/10 text-primary">
                {isProbing ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : (
                  <Upload className={cn("w-6 h-6", isDraggingOver && "animate-bounce")} />
                )}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  {isDraggingOver
                    ? '여기에 영상을 놓으세요!'
                    : isProbing
                    ? '비디오 메타데이터 정밀 분석 중...'
                    : '대용량 롱폼 영상을 드래그하거나 클릭하여 선택'}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  MP4, MOV, MKV, WebM (4K UHD 및 무제한 용량 지원)
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || isProbing}
                className="h-7 text-[11px] font-bold gap-1 mt-1 border-border/80 pointer-events-none"
              >
                <FolderOpen className="w-3 h-3" />
                <span>내 PC에서 파일 찾아보기</span>
              </Button>
            </div>
          )}

          {/* 2. 유튜브 URL 다운로드 영역 */}
          {inputMode === 'youtube' && (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-card">
              <label className="text-[11px] font-bold text-foreground block">
                유튜브 영상 링크 입력
              </label>
              <div className="flex gap-1.5">
                <Input
                  type="text"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  disabled={disabled || isDownloading}
                  className="h-8 text-xs bg-background"
                />
                <Button
                  type="button"
                  onClick={handleDownloadYouTube}
                  disabled={disabled || isDownloading || !youtubeUrl.trim()}
                  className="h-8 px-3 text-xs font-bold gap-1 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  {isDownloading ? (
                    <DownloadCloud className="w-3.5 h-3.5 animate-bounce" />
                  ) : (
                    <Link className="w-3.5 h-3.5" />
                  )}
                  <span>{isDownloading ? '다운로드 중...' : '다운로드'}</span>
                </Button>
              </div>
              <span className="text-[9px] text-muted-foreground block leading-tight">
                * yt-dlp로 최고화질 음원/영상을 다운로드하여 07_Downloads에 저장 후 즉시 VMI 분석 모드로 전환합니다.
              </span>
            </div>
          )}

          {/* 3. 07_Downloads 보관함 선택 영역 */}
          {inputMode === 'library' && (
            <div className="space-y-2 p-3 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={librarySearch}
                    onChange={e => setLibrarySearch(e.target.value)}
                    placeholder="보관함 영상 검색 (제목, 카테고리)..."
                    className="h-7 pl-8 text-xs bg-background"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadLibraryVideos}
                  disabled={isLoadingLibrary}
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoadingLibrary && "animate-spin")} />
                </Button>
              </div>

              {/* 보관함 영상 리스트 */}
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                {isLoadingLibrary ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-primary" />
                    <span>07_Downloads 저장소를 스캔하는 중...</span>
                  </div>
                ) : filteredLibraryVideos.length > 0 ? (
                  filteredLibraryVideos.map(vid => (
                    <div
                      key={vid.id}
                      onClick={() => handleSelectLibraryVideo(vid)}
                      className="p-2 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-muted/40 transition cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-xs font-bold text-foreground truncate block">
                          {vid.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <span className="text-primary font-bold">{vid.category}</span>
                          <span>·</span>
                          <span>{vid.file_size_label}</span>
                          <span>·</span>
                          <span>{vid.created_at}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] font-bold text-primary border-primary/30 shrink-0"
                      >
                        선택
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <span>보관함에 저장된 비디오가 없습니다.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
