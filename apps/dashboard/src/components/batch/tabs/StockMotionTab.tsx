import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  SlidersHorizontal,
  Film,
  Zap,
  CheckCircle2,
  Clock,
  Palette,
  Camera,
  Play,
  Trash2,
  ExternalLink,
  Download,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  Volume2,
  Type,
  Clapperboard,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import {
  exportStockMotionCapCutProject,
  StockMotionJobInput,
} from '@/services/capcutFullProjectExporter';

export type StockMotionStyle = 'bw-sketch' | 'ink-doodle' | 'paper-cutout';

export interface StockMotionQueueItem {
  id: string;
  index: number;
  kind: 'url' | 'file';
  label: string;
  sourceUrl?: string;
  file?: File;
  fileKey?: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  phase?: 'image' | 'video' | 'complete' | 'error';
  imageUrl?: string;
  videoResultUrl?: string;
  videoPath?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface StockMotionTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

// 픽셀링 공인 스타일 프리셋 SSOT
const STYLE_PRESETS: { value: StockMotionStyle; label: string; desc: string; emoji: string }[] = [
  { value: 'bw-sketch', label: '흑백 스케치', desc: '러프한 연필 및 펜선 핸드 드로잉', emoji: '✏️' },
  { value: 'ink-doodle', label: '잉크 낙서', desc: '고대비 블랙 잉크 펜 촉 질감', emoji: '🖋️' },
  { value: 'paper-cutout', label: '종이 컷아웃', desc: '도트 인쇄 및 입체 엣지 컷아웃', emoji: '📄' },
];

// 픽셀링 공인 컷 구성 안내 SSOT
const CUT_BREAKDOWNS = [
  { step: 1, label: '프리즈', value: '원본 액션 피크 지점에서 1.6초 정지' },
  { step: 2, label: '스케치', value: '원본 구도 유지, 흑백 라인, 명암 표현' },
  { step: 3, label: '모션', value: '8장 흔들림, 미세 줌, 팝 SFX' },
];

export const StockMotionTab: React.FC<StockMotionTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 1. 입력 상태 (다중 URL 텍스트 + 로컬 비디오 파일들)
  const [urlsInput, setUrlsInput] = useState<string>('https://www.youtube.com/shorts/JSBjWeSTfx4');
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. 픽셀링 원천 프리셋 및 타이밍 옵션 (단일 진실 공급원)
  const [stylePreset, setStylePreset] = useState<StockMotionStyle>('bw-sketch');
  const [frameCount, setFrameCount] = useState<number>(8); // 4 ~ 12, 기본값 8
  const [holdSeconds, setHoldSeconds] = useState<number>(1.6); // 0.8s ~ 3.2s, 기본값 1.6s
  const [includeSfx, setIncludeSfx] = useState<boolean>(true);
  const [includeCaption, setIncludeCaption] = useState<boolean>(true);

  // 3. 큐 및 렌더링 상태 머신
  const [queue, setQueue] = useState<StockMotionQueueItem[]>([]);
  const [isExportingCapcut, setIsExportingCapcut] = useState<boolean>(false);
  const [lastCapcutDraftPath, setLastCapcutDraftPath] = useState<string>('');
  const processingIdsRef = useRef<Set<string>>(new Set());

  // URL 파싱 (공백/줄바꿈 기준, http/https 필터링, 중복 제거, 최대 20개)
  const parsedUrls = useMemo(() => {
    return Array.from(
      new Set(
        urlsInput
          .split(/\s+/)
          .map(u => u.trim())
          .filter(u => /^https?:\/\//i.test(u))
      )
    );
  }, [urlsInput]);

  // 4. URL 및 파일 변경 시 대기열(queue) 자동 동기화 (최대 20개 슬롯)
  useEffect(() => {
    setQueue(prevQueue => {
      const prevMap = new Map(prevQueue.map(item => [item.id, item]));

      const urlItems: StockMotionQueueItem[] = parsedUrls.map((url, idx) => {
        const id = `url:${url}`;
        let label = `링크 ${idx + 1}`;
        try {
          const pathname = new URL(url).pathname.split('/').filter(Boolean).pop();
          if (pathname) label = `링크 ${idx + 1} · ${pathname}`;
        } catch (_) {}

        return (
          prevMap.get(id) || {
            id,
            index: idx + 1,
            kind: 'url',
            label,
            sourceUrl: url,
            status: 'waiting',
          }
        );
      });

      const fileItems: StockMotionQueueItem[] = localFiles.map((file, idx) => {
        const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
        const id = `file:${fileKey}`;
        return (
          prevMap.get(id) || {
            id,
            index: urlItems.length + idx + 1,
            kind: 'file',
            fileKey,
            file,
            label: file.name,
            status: 'waiting',
          }
        );
      });

      const combined = [...urlItems, ...fileItems].slice(0, 20);
      return combined.map((item, idx) => ({ ...item, index: idx + 1 }));
    });
  }, [parsedUrls, localFiles]);

  // 5대 메트릭 수치
  const runningCount = queue.filter(item => item.status === 'running').length;
  const waitingCount = queue.filter(item => item.status === 'waiting').length;
  const doneCount = queue.filter(item => item.status === 'done').length;
  const errorCount = queue.filter(item => item.status === 'error').length;
  const totalCount = queue.length;

  // 5. 2-슬롯 동시성 워커 엔진 (Pixeling JB 알고리즘 100% 동일)
  const updateItem = useCallback((id: string, patch: Partial<StockMotionQueueItem>) => {
    setQueue(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  useEffect(() => {
    // 2개 동시 처리 세마포어
    const availableSlots = 2 - runningCount;
    if (availableSlots <= 0) return;

    const nextWaiting = queue.filter(
      item => item.status === 'waiting' && !processingIdsRef.current.has(item.id)
    );

    if (nextWaiting.length === 0) return;

    const itemsToStart = nextWaiting.slice(0, availableSlots);

    itemsToStart.forEach(targetItem => {
      processingIdsRef.current.add(targetItem.id);
      updateItem(targetItem.id, {
        status: 'running',
        phase: 'image',
        startedAt: new Date().toLocaleTimeString(),
        error: undefined,
      });

      (async () => {
        try {
          // [Step 1] 피크 액션 프레임 추출 및 흑백 스케치 필터 처리
          let videoSource = targetItem.sourceUrl || '';
          if (targetItem.kind === 'file' && targetItem.file) {
            // 로컬 파일의 경우 임시 업로드 또는 FormData 전송
            const formData = new FormData();
            formData.append('file', targetItem.file);
            const uploadRes = await api.post('/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            videoSource = uploadRes.data?.file_path || targetItem.file.name;
          }

          const frameRes = await api.post('/render/stock-motion/process-frame', {
            video_source: videoSource,
            timestamp_sec: 0.9,
            style_preset: stylePreset,
          });

          const sketchImagePath = frameRes.data?.sketch_frame_path;
          const previewUrl = frameRes.data?.preview_url;

          updateItem(targetItem.id, {
            phase: 'video',
            imageUrl: previewUrl,
          });

          // [Step 2] Remotion 1080x1920 MP4 실물 렌더링
          const renderRes = await api.post('/render/stock-motion/render-mp4', {
            job_id: `stock_${Date.now()}_${targetItem.index}`,
            title: targetItem.label.replace(/\.[^.]+$/g, ''),
            video_source: frameRes.data?.video_path || videoSource,
            sketch_source: sketchImagePath,
            style_preset: stylePreset,
            frame_count: frameCount,
            hold_seconds: holdSeconds,
            include_sfx: includeSfx,
            include_caption: includeCaption,
            archetype: 'classic',
          });

          const completedVideoPath = renderRes.data?.video_path;
          const streamUrl = renderRes.data?.stream_url;

          updateItem(targetItem.id, {
            status: 'done',
            phase: 'complete',
            videoResultUrl: streamUrl,
            videoPath: completedVideoPath,
            completedAt: new Date().toLocaleTimeString(),
          });

          // 전역 완성 큐로 즉시 인계 (하단 완성된 일괄 프로젝트 대기열 직결)
          const newBatchJob = {
            id: renderRes.data?.job_id || `stock-motion-${Date.now()}`,
            title: `[스톡모션] ${targetItem.label.replace(/\.[^.]+$/g, '')}`,
            sourceType: 'video',
            archetype: 'classic',
            tabId: 'stock-motion',
            createdAt: new Date().toLocaleTimeString(),
            status: 'done',
            video_path: completedVideoPath,
            stream_url: streamUrl,
            video_filename: renderRes.data?.filename,
            file_size_bytes: renderRes.data?.file_size_bytes,
            duration_seconds: renderRes.data?.duration_seconds,
            subtitles: renderRes.data?.subtitles,
            pixeling_meta: renderRes.data?.pixeling_meta,
            formatted_pixeling_text: renderRes.data?.pixeling_meta?.formatted_text,
            scriptLinesCount: frameCount,
            metadata: {
              sourceUrl: targetItem.sourceUrl,
              stylePreset,
              frameCount,
              holdSeconds,
              includeSfx,
              includeCaption,
            },
          };

          onAddBatchJobs([newBatchJob]);
        } catch (err: any) {
          console.error('[StockMotion] Worker error:', err);
          updateItem(targetItem.id, {
            status: 'error',
            phase: 'error',
            error: err.response?.data?.detail || err.message || '스톡모션 생성 중 오류가 발생했습니다.',
            completedAt: new Date().toLocaleTimeString(),
          });
        } finally {
          processingIdsRef.current.delete(targetItem.id);
        }
      })();
    });
  }, [queue, runningCount, stylePreset, frameCount, holdSeconds, includeSfx, includeCaption, onAddBatchJobs, updateItem]);

  // 로컬 비디오 파일 추가 핸들러 (중복 방지, 최대 20개)
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('video/'));
    if (files.length === 0) {
      toast({ variant: 'destructive', title: '영상 파일 선택 필요', description: '동영상 파일(MP4 등)을 선택해주세요.' });
      return;
    }

    setLocalFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}:${f.size}:${f.lastModified}`));
      const newFiles = files.filter(f => !existingKeys.has(`${f.name}:${f.size}:${f.lastModified}`));
      const combined = [...prev, ...newFiles].slice(0, 20);

      toast({
        title: '📁 파일 대기열 추가',
        description: `${newFiles.length}개 영상이 스톡모션 큐에 등록되었습니다. (항상 2개씩 자동 제작)`,
      });

      return combined;
    });

    if (e.target) e.target.value = '';
  };

  // 아이템 삭제
  const handleRemoveItem = (item: StockMotionQueueItem) => {
    if (item.kind === 'url' && item.sourceUrl) {
      setUrlsInput(prev =>
        prev
          .split(/\s+/)
          .filter(u => u.trim() !== item.sourceUrl)
          .join('\n')
      );
    } else if (item.kind === 'file' && item.fileKey) {
      setLocalFiles(prev =>
        prev.filter(f => `${f.name}:${f.size}:${f.lastModified}` !== item.fileKey)
      );
    }
  };

  // [매니페스트] 다운로드 (kind: "pixi.stock-motion-batch" 100% 원천 규격)
  const handleExportManifest = () => {
    if (queue.length === 0) {
      toast({ variant: 'destructive', title: '대기열 없음', description: '저장할 스톡모션 작업이 없습니다.' });
      return;
    }

    const manifestData = {
      kind: 'pixi.stock-motion-batch',
      version: 1,
      createdAt: new Date().toISOString(),
      sourceUrls: parsedUrls,
      stylePreset,
      maxJobs: 20,
      parallelCount: 2,
      frameCount,
      holdSeconds,
      includeSfx,
      includeCaption,
      summary: {
        totalJobs: queue.length,
        doneCount,
        errorCount,
        runningCount,
        waitingCount,
      },
      queue: queue.map(item => ({
        index: item.index,
        kind: item.kind,
        label: item.label,
        sourceUrl: item.sourceUrl,
        status: item.status,
        phase: item.phase,
        imageUrl: item.imageUrl,
        videoResultUrl: item.videoResultUrl,
        videoPath: item.videoPath,
        error: item.error,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
      })),
    };

    const blob = new Blob([JSON.stringify(manifestData, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-motion-batch-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: '📋 매니페스트 저장 완료',
      description: '스톡모션 일괄 작업 매니페스트 JSON 파일이 다운로드되었습니다.',
    });
  };

  // [CapCut 일괄 내보내기]
  const handleExportCapcut = async () => {
    if (queue.length === 0) {
      toast({ variant: 'destructive', title: '작업 없음', description: 'CapCut으로 내보낼 원본 영상 작업을 먼저 추가해주세요.' });
      return;
    }

    setIsExportingCapcut(true);
    try {
      const jobsToExport: StockMotionJobInput[] = queue.map(item => ({
        id: item.id,
        title: item.label.replace(/\.[^.]+$/g, ''),
        sourceName: item.label,
        sourcePath: item.videoPath || 'video.mp4',
        sourceUrl: item.videoResultUrl || item.sourceUrl,
        stylePreset,
        frameCount,
        holdSeconds,
        includeSfx,
        includeCaption,
      }));

      const res = await exportStockMotionCapCutProject({
        projectName: `Pixi_StockMotion_${Date.now()}`,
        jobs: jobsToExport,
      });

      if (res.targetPath) {
        setLastCapcutDraftPath(res.targetPath);
      }

      toast({
        title: '🎬 CapCut 초안 내보내기 완료',
        description: `${jobsToExport.length}개 스톡모션 작업이 CapCut 1:1 무손실 초안으로 생성되었습니다.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'CapCut 내보내기 실패',
        description: err.message || '초안 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsExportingCapcut(false);
    }
  };

  return (
    <TooltipProvider>
      <section data-pixi-stock-motion-batch-tab="true" className="space-y-4">
        {/* ── 2-컬럼 레이아웃 (픽셀링 원천 JH 1:1 동일) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          {/* ============================================================ */}
          {/* [좌측 메인 컬럼]: 헤더, 5대 지표, 입력 폼, 대기열, 옵션 컨트롤 */}
          {/* ============================================================ */}
          <div className="space-y-4">
            {/* 1. 상단 타이틀 & 뱃지 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex min-w-0 items-center gap-2 font-black text-lg text-foreground">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <span>스톡모션 (Stock Motion)</span>
                  </h2>
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    링크나 로컬 비디오 파일을 넣으면 2개씩 자동 제작하고 나머지는 대기열에서 순서대로 무결점 진행합니다.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-mono px-2.5 py-1',
                    totalCount > 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {totalCount > 0 ? '🟢 자동 큐 진행 중' : '⚪ 링크/파일 대기'}
                </Badge>
              </div>

              {/* 2. 작업 상태 5대 메트릭 박스 (픽셀링 원천 100% 복원) */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-border">
                {[
                  { label: '작업', value: `${totalCount}/20`, color: 'text-foreground' },
                  { label: '진행', value: `${runningCount}/2`, color: 'text-primary' },
                  { label: '대기', value: `${waitingCount}`, color: 'text-amber-500' },
                  { label: '완료', value: `${doneCount}`, color: 'text-emerald-500' },
                  { label: '실패', value: `${errorCount}`, color: 'text-destructive' },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-border/80 bg-background/60 p-2.5 text-center shadow-2xs"
                  >
                    <div className="text-[11px] font-bold text-muted-foreground">{metric.label}</div>
                    <div className={cn('text-base font-black font-mono tabular-nums mt-0.5', metric.color)}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. 제작 링크 입력 (다중 URL Textarea) */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <span>제작 링크</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground cursor-pointer">
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-xs">
                      YouTube Shorts 같은 원본 링크를 줄바꿈으로 여러 줄 넣으면 최대 20개까지 자동 대기열을 생성합니다.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <textarea
                  value={urlsInput}
                  onChange={e => setUrlsInput(e.target.value)}
                  placeholder="YouTube Shorts URL을 한 줄에 하나씩 붙여넣기 (최대 20개)"
                  rows={3}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition"
                />
              </div>

              {/* 4. 로컬 원본 비디오 파일 추가 드롭존 */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <span>로컬 원본 비디오 추가</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground cursor-pointer">
                            <HelpCircle className="w-3.5 h-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-xs">
                          링크 대신 로컬 PC의 MP4/MOV 영상을 선택해도 같은 자동 2-슬롯 큐에서 순서대로 처리됩니다.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      링크와 로컬 파일을 합쳐 최대 20개까지, 항상 2개 슬롯으로 자동 제작됩니다.
                    </p>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={handleAddFiles}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary" />
                      <span>파일 추가</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* 5. 대기열 실시간 리스트 (Zero Mock UI Law 100% 준수) */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>작업 대기열 ({queue.length})</span>
                  <span className="text-[10px] font-mono text-muted-foreground">PARALLEL SLOTS: 2</span>
                </div>

                {queue.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center text-xs text-muted-foreground space-y-1">
                    <Film className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                    <div>링크를 붙여넣거나 영상을 넣으면 자동으로 2개씩 제작 큐가 시작됩니다.</div>
                    <div className="text-[10.5px] opacity-70">
                      최대 20개 대기열 지원 · 0.9초 프리즈 스케치 + 8프레임 지터 모션
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {queue.map(item => (
                      <div
                        key={item.id}
                        className={cn(
                          'grid grid-cols-[40px_minmax(0,1fr)_90px_70px_32px] items-center gap-2 rounded-lg border p-2.5 text-xs transition',
                          item.status === 'running'
                            ? 'bg-primary/5 border-primary/40'
                            : item.status === 'done'
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : item.status === 'error'
                            ? 'bg-destructive/5 border-destructive/30'
                            : 'bg-background border-border'
                        )}
                      >
                        {/* 번호 */}
                        <div className="font-mono font-bold text-muted-foreground text-center">
                          #{String(item.index).padStart(2, '0')}
                        </div>

                        {/* 제목 및 소스 라벨 */}
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{item.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {item.kind === 'url' ? item.sourceUrl : '로컬 비디오 파일'}
                          </div>
                        </div>

                        {/* 상태 및 진행 단계 */}
                        <div>
                          {item.status === 'running' ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30 flex items-center gap-1 w-fit">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                              <span>{item.phase === 'video' ? 'MP4 렌더링' : '스케치 추출'}</span>
                            </Badge>
                          ) : item.status === 'done' ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>완료</span>
                            </Badge>
                          ) : item.status === 'error' ? (
                            <Badge variant="outline" className="text-[10px] font-bold bg-destructive/10 text-destructive border-destructive/30 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>실패</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border w-fit">
                              대기 중
                            </Badge>
                          )}
                        </div>

                        {/* 미리보기 / 정보 */}
                        <div className="text-[10.5px] font-mono text-muted-foreground truncate">
                          {item.videoResultUrl ? (
                            <a
                              href={item.videoResultUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5 font-bold"
                            >
                              <span>재생</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : item.kind === 'file' && item.file ? (
                            `${(item.file.size / 1024 / 1024).toFixed(1)}MB`
                          ) : (
                            '온라인'
                          )}
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 에러 상세 메시지 표시 */}
                        {item.error && (
                          <div className="col-span-5 text-[10.5px] text-destructive bg-destructive/10 rounded p-1.5 mt-1">
                            {item.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 6. 스톡모션 세부 설정 (그림체, 프레임 수, 홀드 길이, SFX, 리액션 자막) */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  스톡모션 세부 연출 옵션
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">PARALLEL: 2 SLOTS</span>
              </div>

              {/* 3대 공인 그림체 선택 */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground block">그림체 스타일 프리셋</label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setStylePreset(preset.value)}
                      className={cn(
                        'p-2.5 rounded-lg border text-left text-xs transition cursor-pointer font-bold',
                        stylePreset === preset.value
                          ? 'bg-primary/10 border-primary text-primary shadow-2xs'
                          : 'border-border bg-background hover:bg-muted/40 text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <span>{preset.emoji}</span>
                        <span>{preset.label}</span>
                      </div>
                      <div className="text-[9.5px] text-muted-foreground font-normal mt-0.5 leading-snug">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 프레임 수 및 홀드 지속 시간 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                {/* 프레임 수 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">추출 프레임 수</span>
                    <span className="font-mono font-bold text-primary">{frameCount} 프레임 (6.25fps)</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[4, 6, 8, 10, 12].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setFrameCount(cnt)}
                        className={cn(
                          'p-1.5 rounded border text-center text-xs font-mono font-bold transition cursor-pointer',
                          frameCount === cnt
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-background hover:bg-muted text-foreground'
                        )}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 홀드 지속 시간 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">프리즈 정지 시간</span>
                    <span className="font-mono font-bold text-primary">{holdSeconds.toFixed(1)}초</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="3.2"
                    step="0.1"
                    value={holdSeconds}
                    onChange={e => setHoldSeconds(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[9.5px] font-mono text-muted-foreground">
                    <span>0.8s (스낵)</span>
                    <span>1.6s (표준)</span>
                    <span>3.2s (강조)</span>
                  </div>
                </div>
              </div>

              {/* 2대 토글 스위치 (팝 SFX, 리액션 자막) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">팝 SFX 사운드</div>
                      <div className="text-[10px] text-muted-foreground">프레임 전환 시 페이퍼 셔터 효과음</div>
                    </div>
                  </div>
                  <Switch checked={includeSfx} onCheckedChange={setIncludeSfx} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">리액션 마커 자막</div>
                      <div className="text-[10px] text-muted-foreground">하단에 프리즈/변환 배지 자동 합성</div>
                    </div>
                  </div>
                  <Switch checked={includeCaption} onCheckedChange={setIncludeCaption} />
                </div>
              </div>

              {/* 7. 작업 내보내기 버튼 바 (매니페스트 & CapCut 초안) */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExportManifest}
                  disabled={queue.length === 0}
                  className="h-8 text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>매니페스트 JSON 저장</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportCapcut}
                  disabled={queue.length === 0 || isExportingCapcut}
                  className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                >
                  <Clapperboard className="w-3.5 h-3.5" />
                  <span>{isExportingCapcut ? 'CapCut 생성 중...' : 'CapCut 일괄 내보내기'}</span>
                </Button>
              </div>

              {lastCapcutDraftPath && (
                <div className="rounded-lg border border-border bg-muted/30 p-2 text-xs text-muted-foreground flex items-center justify-between">
                  <span className="truncate">최근 CapCut 초안: {lastCapcutDraftPath}</span>
                  <FolderOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* [우측 Aside 컬럼 (360px)]: 컷 구성 & 다음 연결점 (원천 1:1) */}
          {/* ============================================================ */}
          <aside className="space-y-4">
            {/* 1. 컷 구성 안내 카드 (프리즈, 스케치, 모션) */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b border-border pb-2">
                <Film className="w-4 h-4 text-primary" />
                <span>스톡모션 컷 구성</span>
              </div>

              <div className="space-y-2">
                {CUT_BREAKDOWNS.map(cut => (
                  <div
                    key={cut.step}
                    className="rounded-lg border border-border/80 bg-muted/20 p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono font-bold text-[10.5px] text-primary-foreground">
                        {cut.step}
                      </span>
                      <span className="font-bold text-foreground">{cut.label}</span>
                    </div>
                    <div className="pl-7 text-[11px] text-muted-foreground leading-relaxed">
                      {cut.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 총 재생시간 및 타이밍 계산 카드 */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground border-b border-border pb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>타임라인 길이 연산 (JI 알고리즘)</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>1. 원본 액션 (피크)</span>
                  <span className="font-mono font-bold text-foreground">0.9초 (900ms)</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>2. 스케치 프리즈</span>
                  <span className="font-mono font-bold text-foreground">{holdSeconds.toFixed(1)}초 ({Math.round(holdSeconds * 1000)}ms)</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>3. 스톱모션 지터 ({frameCount}장)</span>
                  <span className="font-mono font-bold text-foreground">{((frameCount * 160) / 1000).toFixed(2)}초 ({frameCount * 160}ms)</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center font-bold">
                  <span className="text-foreground">총 쇼츠 씬 길이:</span>
                  <span className="font-mono text-sm text-primary font-black">
                    {((900 + Math.max(800, Math.round(holdSeconds * 1000)) + frameCount * 160) / 1000).toFixed(2)}초
                  </span>
                </div>
              </div>
            </div>

            {/* 3. 다음 연결점 (공식 아키텍처 배지) */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="font-bold text-xs text-foreground border-b border-border pb-2">
                다음 연결점 (주권 엔진)
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  '최대 20개 배치 큐',
                  '2개 동시 제작 슬롯',
                  'FFmpeg 0.9초 캡처',
                  '3대 흑백 스케치 필터',
                  'Remotion 1080x1920',
                  'CapCut 1:1 초안 직결',
                ].map(tag => (
                  <div
                    key={tag}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-muted/30 px-2 py-1 text-[10.5px] text-muted-foreground font-semibold text-center truncate"
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </TooltipProvider>
  );
};
