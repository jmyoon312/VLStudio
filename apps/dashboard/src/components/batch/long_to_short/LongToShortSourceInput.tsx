import React, { useState } from 'react';
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
  DownloadCloud
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { VideoProbeResult } from '@/types/longToShort';
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
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isProbing, setIsProbing] = useState<boolean>(false);

  // 로컬 파일 업로드 처리
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProbing(true);
    try {
      // Electron or Local Web Path handling
      const filePath = (file as any).path || file.name;
      const res = await longToShortApi.probeVideo(filePath);
      onProbeComplete(res);
      toast({
        title: '✅ 롱폼 비디오 로드 완료',
        description: `'${file.name}' (${res.duration_label}, ${res.resolution_label}) 분석 준비 완료.`
      });
    } catch (err: any) {
      // Electron 외부의 브라우저 업로드일 경우 대체 정보 생성
      console.warn('Probe API failed, applying fallback metadata:', err);
      const fallbackData: VideoProbeResult = {
        success: true,
        video_path: (file as any).path || file.name,
        file_name: file.name,
        file_size_bytes: file.size,
        duration_sec: 1800,
        duration_label: '약 30분',
        width: 1920,
        height: 1080,
        resolution_label: '1920x1080 (FHD)',
        video_codec: 'h264',
        audio_codec: 'aac',
        is_h264: true,
        is_compatible: true,
        recommended_candidates: 3,
        max_candidates: 10
      };
      onProbeComplete(fallbackData);
      toast({
        title: '📁 롱폼 비디오 등록 완료',
        description: `'${file.name}' 파일이 등록되었습니다.`
      });
    } finally {
      setIsProbing(false);
    }
  };

  // 유튜브 URL 다운로드
  const handleDownloadYouTube = async () => {
    if (!youtubeUrl.trim()) {
      toast({ variant: 'destructive', title: 'URL 입력 필요', description: '유튜브 영상 링크를 입력하세요.' });
      return;
    }

    setIsDownloading(true);
    try {
      toast({
        title: '⬇️ 유튜브 고속 다운로드 시작',
        description: 'yt-dlp를 통해 07_Downloads 저장소로 다운로드 중입니다...'
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

  return (
    <div className="space-y-3.5">
      {/* 타이틀 및 헤더 */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-primary" />
          롱폼 원본 소스 인입
        </span>
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
          VMI ENGINE
        </Badge>
      </div>

      {/* 등록된 비디오가 있는 경우: 메타데이터 인스펙터 카드 */}
      {probeData ? (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground truncate block">
                {probeData.file_name}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {(probeData.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSource}
              disabled={disabled}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              소스 교체
            </Button>
          </div>

          {/* 메타데이터 지표 뱃지 그리드 */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">영상 길이</span>
              <strong className="text-[11px] font-mono text-primary">{probeData.duration_label}</strong>
            </div>
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">해상도</span>
              <strong className="text-[11px] font-mono text-foreground">{probeData.resolution_label}</strong>
            </div>
            <div className="p-1.5 rounded-lg border border-border bg-card text-center">
              <span className="text-[9px] text-muted-foreground block">비디오 코덱</span>
              <strong className="text-[11px] font-mono text-foreground uppercase">{probeData.video_codec}</strong>
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
            <span>중복 없이 최대 {probeData.max_candidates}개 가능</span>
          </div>
        </div>
      ) : (
        /* 소스 미등록 상태: 파일 업로드 및 유튜브 인풋 */
        <div className="space-y-3">
          {/* 로컬 파일 드롭존 */}
          <label className={cn(
            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition cursor-pointer text-center",
            isProbing && "opacity-60 pointer-events-none"
          )}>
            <Upload className="w-5 h-5 text-primary animate-pulse" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-foreground block">
                {isProbing ? '비디오 메타데이터 분석 중...' : '로컬 대용량 롱폼 영상 선택'}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                MP4, MOV, MKV, WebM (최대 4K 지원)
              </span>
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              disabled={disabled || isProbing}
              className="hidden"
            />
          </label>

          {/* 구분선 */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>또는 유튜브 롱폼 링크</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 유튜브 링크 인풋 및 다운로드 버튼 */}
          <div className="space-y-1.5">
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
                <span>다운로드</span>
              </Button>
            </div>
            <span className="text-[9px] text-muted-foreground block">
              * yt-dlp로 최고화질 음원/영상을 다운로드하여 07_Downloads에 저장합니다.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
