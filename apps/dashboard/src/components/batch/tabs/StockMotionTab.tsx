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
  RefreshCw,
  X,
  Eye,
  Check
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
import { playSynthesizedSfx } from '@/config/sfxCatalog';
import {
  exportStockMotionCapCutProject,
  StockMotionJobInput,
} from '@/services/capcutFullProjectExporter';

export type StockMotionStyle =
  | 'auto-match'
  | 'bw-sketch'
  | 'ink-doodle'
  | 'paper-cutout'
  | 'whiteboard-stream'
  | 'neon-cyberpunk'
  | 'vintage-comic'
  | 'manga-screentone';

export type DurationMode = 'hook-only' | 'full-continuation';

export interface HighlightCandidate {
  timestamp: number;
  reason: string;
  punchline: string;
  score: number;
}

export interface StockMotionQueueItem {
  id: string;
  index: number;
  kind: 'url' | 'file';
  label: string;
  sourceUrl?: string;
  file?: File;
  fileKey?: string;
  status: 'analyzing' | 'ready' | 'waiting' | 'running' | 'done' | 'error';
  autoStartWhenAnalyzed?: boolean;
  phase?: 'image' | 'video' | 'complete' | 'error';
  imageUrl?: string;
  videoResultUrl?: string;
  videoPath?: string;
  sketchFrames?: string[];   // 8-frame line-boil sequence PNG paths
  previewUrls?: string[];    // HTTP URLs for filmstrip thumbnails
  detectedTimestampSec?: number;
  detectedReason?: string;
  detectedPunchlineText?: string;
  highlightCandidates?: HighlightCandidate[];
  detectedStyle?: StockMotionStyle;
  selectedStyle?: StockMotionStyle;
  styleReason?: string;
  isAnalyzingHighlight?: boolean;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface StockMotionTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
  videoList?: any[];
}

// 픽셀링 공인 스타일 프리셋 SSOT (AI 자동 추천 + 7대 바이럴 스타일)
const STYLE_PRESETS: { value: StockMotionStyle; label: string; desc: string; emoji: string }[] = [
  { value: 'auto-match', label: '🤖 AI 스마트 추천', desc: '대사 분위기·음향 피크에 맞춰 7대 스타일 중 최적 매칭', emoji: '🤖' },
  { value: 'bw-sketch', label: '흑백 스케치', desc: '정통 연필 데생 및 흑연 명암 블렌딩', emoji: '✏️' },
  { value: 'ink-doodle', label: '잉크 낙서', desc: '고대비 블랙 잉크 펜촉 웹툰 질감', emoji: '🖋️' },
  { value: 'paper-cutout', label: '종이 컷아웃', desc: '입체 엣지 컷아웃 및 색면 포스터라이즈', emoji: '📄' },
  { value: 'whiteboard-stream', label: '화이트보드 손그림', desc: '자막 싱크 2단계(잉크→컬러) 실시간 드로잉', emoji: '✍️' },
  { value: 'neon-cyberpunk', label: '네온 사이버펑크', desc: '시안/마젠타 발광 글로우 & 암흑 다크 배경', emoji: '⚡' },
  { value: 'vintage-comic', label: '빈티지 코믹스', desc: '하프톤 망점(Ben-Day) & 팝아트 외곽선', emoji: '💥' },
  { value: 'manga-screentone', label: '망가 스크린톤', desc: '소년점프 45° 망점 스크린톤 & 흑백 대비', emoji: '📖' },
];

// 픽셀링 공인 컷 구성 안내 SSOT
const CUT_BREAKDOWNS = [
  { step: 1, label: '프리즈', value: '원본 액션 피크 지점에서 1.6초 정지' },
  { step: 2, label: '스케치', value: '원본 구도 유지, 흑백 라인, 명암 표현' },
  { step: 3, label: '모션', value: '8장 흔들림, 미세 줌, 팝 SFX' },
  { step: 4, label: '이어보기', value: '피크 지점부터 원본 영상 자연 연장 재생' },
];

export const StockMotionTab: React.FC<StockMotionTabProps> = ({ onAddBatchJobs, videoList = [] }) => {
  const { toast } = useToast();

  // 1. 입력 상태 (다중 URL 텍스트 + 로컬 비디오 파일들)
  const [urlsInput, setUrlsInput] = useState<string>('');
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState<boolean>(false);
  const [previewSketchUrl, setPreviewSketchUrl] = useState<string | null>(null);
  const [previewVideoModalUrl, setPreviewVideoModalUrl] = useState<string | null>(null);
  const [previewTargetItem, setPreviewTargetItem] = useState<StockMotionQueueItem | null>(null);

  // 2. 픽셀링 원천 프리셋 및 타이밍 옵션 (단일 진실 공급원)
  const [stylePreset, setStylePreset] = useState<StockMotionStyle>('auto-match');
  const [durationMode, setDurationMode] = useState<DurationMode>('full-continuation'); // 'hook-only' vs 'full-continuation'
  const [postContinuationSec, setPostContinuationSec] = useState<number>(15.0); // 풀 쇼츠 이어보기 초수
  const [autoStart, setAutoStart] = useState<boolean>(false); // 추가 즉시 자동 시작 토글 (기본값: false로 옵션 선행 확인 지원)
  const [autoPeakSync, setAutoPeakSync] = useState<boolean>(true); // AI 자동 하이라이트 & 펀치라인 동기화 (기본값: true)
  const [frameCount, setFrameCount] = useState<number>(8); // 4 ~ 12, 기본값 8
  const [holdSeconds, setHoldSeconds] = useState<number>(1.6); // 0.8s ~ 3.2s, 기본값 1.6s
  const [timestampSec, setTimestampSec] = useState<number>(0.9); // 0.1s ~ 10.0s, 기본값 0.9s
  const [enableSpeedlines, setEnableSpeedlines] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMarker, setCustomMarker] = useState<string>('');
  const [paperColor, setPaperColor] = useState<string>('#F5EBD7'); // #F5EBD7 (웜톤), #FFFFFF, #E8DCC4
  const [enableStylus, setEnableStylus] = useState<boolean>(true);
  const [enableVoiceoverCarve, setEnableVoiceoverCarve] = useState<boolean>(true);
  const [includeSfx, setIncludeSfx] = useState<boolean>(true);
  const [includeCaption, setIncludeCaption] = useState<boolean>(true);

  // 3. 큐 및 렌더링 상태 머신
  const [queue, setQueue] = useState<StockMotionQueueItem[]>([]);
  const [isExportingCapcut, setIsExportingCapcut] = useState<boolean>(false);
  const [lastCapcutDraftPath, setLastCapcutDraftPath] = useState<string>('');
  const processingIdsRef = useRef<Set<string>>(new Set());
  const analyzingIdsRef = useRef<Set<string>>(new Set());

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
      const defaultStatus = autoPeakSync ? 'analyzing' : (autoStart ? 'waiting' : 'ready');
      const isAnalyzing = autoPeakSync;

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
            status: defaultStatus,
            isAnalyzingHighlight: isAnalyzing,
          }
        );
      });

      const fileItems: StockMotionQueueItem[] = localFiles.map((file, idx) => {
        const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
        const id = `file:${fileKey}`;
        const nativePath = (file as any).path || '';
        return (
          prevMap.get(id) || {
            id,
            index: urlItems.length + idx + 1,
            kind: 'file',
            fileKey,
            file,
            videoPath: nativePath || undefined,
            label: file.name,
            status: defaultStatus,
            isAnalyzingHighlight: isAnalyzing,
          }
        );
      });

      const libraryItems = prevQueue.filter(item => item.id.startsWith('lib:'));
      const combined = [...urlItems, ...fileItems, ...libraryItems].slice(0, 20);
      return combined.map((item, idx) => ({ ...item, index: idx + 1 }));
    });
  }, [parsedUrls, localFiles, autoStart, autoPeakSync]);

  // 5대 메트릭 수치
  const totalCount = queue.length;
  const analyzingCount = queue.filter(item => item.status === 'analyzing' || item.isAnalyzingHighlight).length;
  const readyCount = queue.filter(item => item.status === 'ready').length;
  const runningCount = queue.filter(item => item.status === 'running').length;
  const waitingCount = queue.filter(item => item.status === 'waiting').length;
  const doneCount = queue.filter(item => item.status === 'done').length;
  const errorCount = queue.filter(item => item.status === 'error').length;

  // 5. 2-슬롯 동시성 워커 엔진 (Pixeling JB 알고리즘 100% 동일)
  const updateItem = useCallback((id: string, patch: Partial<StockMotionQueueItem>) => {
    setQueue(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  // [신규 혁신] 비디오 등록 시 Whisper STT 대사 및 오디오 피크 자동 정밀 분석 (Auto Peak Sync)
  useEffect(() => {
    if (!autoPeakSync) return;

    const unanalyzedItems = queue.filter(
      item =>
        item.detectedTimestampSec === undefined &&
        !analyzingIdsRef.current.has(item.id) &&
        (item.sourceUrl || item.videoPath || item.file)
    );

    unanalyzedItems.forEach(async item => {
      analyzingIdsRef.current.add(item.id);
      updateItem(item.id, {
        isAnalyzingHighlight: true,
        status: 'analyzing',
        previewUrls: undefined,
        sketchFrames: undefined,
        imageUrl: undefined,
      });

      try {
        let videoSrc = item.videoPath || item.sourceUrl;
        if (!videoSrc && item.kind === 'file' && item.file) {
          const formData = new FormData();
          formData.append('file', item.file);
          const uploadRes = await api.post('/videos/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 180000,
          });
          videoSrc = uploadRes.data?.file_path || uploadRes.data?.video?.file_path || '';
          if (videoSrc) {
            updateItem(item.id, { videoPath: videoSrc });
          }
        }

        if (!videoSrc) {
          throw new Error('비디오 소스(URL 또는 로컬 파일)를 찾을 수 없습니다.');
        }

        const res = await api.post(
          '/render/stock-motion/analyze-highlight',
          {
            video_source: videoSrc,
            preferred_window_start: 0.8,
            preferred_window_end: 30.0,
          },
          { timeout: 180000 }
        );

        if (res.data?.success) {
          setQueue(prev =>
            prev.map(q => {
              if (q.id !== item.id) return q;
              const nextStatus = (autoStart || q.autoStartWhenAnalyzed) ? 'waiting' : 'ready';
              return {
                ...q,
                videoPath: res.data.video_path || q.videoPath,
                detectedTimestampSec: res.data.golden_timestamp,
                detectedReason: res.data.detected_reason,
                detectedPunchlineText: res.data.punchline_text,
                highlightCandidates: res.data.highlight_candidates || q.highlightCandidates,
                detectedStyle: res.data.recommended_style,
                styleReason: res.data.style_reason,
                imageUrl: res.data.preview_url || q.imageUrl,
                isAnalyzingHighlight: false,
                status: q.status === 'analyzing' ? nextStatus : q.status,
              };
            })
          );
        } else {
          updateItem(item.id, {
            isAnalyzingHighlight: false,
            status: item.status === 'analyzing' ? ((autoStart || item.autoStartWhenAnalyzed) ? 'waiting' : 'ready') : item.status,
            detectedTimestampSec: item.detectedTimestampSec || 2.5,
          });
        }
      } catch (err) {
        console.warn('[StockMotion] Highlight analysis fallback:', err);
        updateItem(item.id, {
          isAnalyzingHighlight: false,
          status: item.status === 'analyzing' ? ((autoStart || item.autoStartWhenAnalyzed) ? 'waiting' : 'ready') : item.status,
          detectedTimestampSec: item.detectedTimestampSec || 2.5,
        });
      } finally {
        analyzingIdsRef.current.delete(item.id);
      }
    });
  }, [queue, autoPeakSync, autoStart, timestampSec, updateItem]);

  useEffect(() => {
    // 2개 동시 처리 세마포어
    const availableSlots = 2 - runningCount;
    if (availableSlots <= 0) return;

    // [게이트키퍼] 하이라이트 분석이 진행 중이거나 골든 타임스탬프가 아직 확정되지 않은 항목은 절대 시작하지 않음
    const nextWaiting = queue.filter(
      item =>
        item.status === 'waiting' &&
        !processingIdsRef.current.has(item.id) &&
        !item.isAnalyzingHighlight &&
        item.status !== 'analyzing' &&
        (item.detectedTimestampSec !== undefined || !autoPeakSync)
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
          let videoSource = targetItem.videoPath || targetItem.sourceUrl || '';
          if (!videoSource && targetItem.kind === 'file' && targetItem.file) {
            // 로컬 파일의 경우 임시 업로드 또는 FormData 전송
            const formData = new FormData();
            formData.append('file', targetItem.file);
            const uploadRes = await api.post('/videos/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 180000,
            });
            videoSource = uploadRes.data?.file_path || uploadRes.data?.video?.file_path || '';
            if (!videoSource) {
              throw new Error('파일 업로드 후 로컬 파일 경로를 취득하지 못했습니다.');
            }
            updateItem(targetItem.id, { videoPath: videoSource });
          }

          if (!videoSource || !videoSource.trim()) {
            throw new Error('유효한 동영상 소스(URL 또는 로컬 파일)를 찾을 수 없습니다.');
          }

          let sketchImagePath: string | undefined;
          let sketchFramesPaths: string[] = [];
          let previewUrl: string | undefined;
          let previewUrls: string[] = [];
          let completedVideoPath: string | undefined;
          let streamUrl: string | undefined;
          let responseMeta: any = null;

          const jobTitle = customTitle.trim() || targetItem.label.replace(/\.[^.]+$/g, '');

          // AI 자동 하이라이트 동기화 & AI 자동 추천 스타일 실시간 산출
          const effectiveTimestamp =
            autoPeakSync && targetItem.detectedTimestampSec !== undefined
              ? targetItem.detectedTimestampSec
              : timestampSec;

          const effectiveStyle: StockMotionStyle =
            targetItem.selectedStyle ||
            (stylePreset === 'auto-match'
              ? (targetItem.detectedStyle || 'vintage-comic')
              : stylePreset);

          if (effectiveStyle === 'whiteboard-stream') {
            // [화이트보드 손그림 전용 스트림 파이프라인]
            const wbProcessRes = await api.post(
              '/render/whiteboard/process-scene',
              {
                video_source: videoSource,
                timestamp_sec: effectiveTimestamp,
                paper_color_hex: paperColor,
                aspect_ratio: '9:16',
              },
              { timeout: 180000 }
            );

            previewUrl = wbProcessRes.data?.preview_url;
            updateItem(targetItem.id, {
              phase: 'video',
              imageUrl: previewUrl,
            });

            const wbRenderRes = await api.post(
              '/render/whiteboard/render-mp4',
              {
                job_id: `wb_${Date.now()}_${targetItem.index}`,
                title: jobTitle,
                source_image: wbProcessRes.data?.base_image_path,
                elements: wbProcessRes.data?.elements,
                paper_color_hex: paperColor,
                aspect_ratio: '9:16',
                enable_stylus: enableStylus,
                include_sfx: includeSfx,
                archetype: 'classic',
              },
              { timeout: 300000 }
            );

            completedVideoPath = wbRenderRes.data?.video_path;
            streamUrl = wbRenderRes.data?.stream_url;
            responseMeta = wbRenderRes.data;
          } else {
            // [기존 8-프레임 Line-Boil 플립북 파이프라인]
            const frameRes = await api.post(
              '/render/stock-motion/process-frame',
              {
                video_source: videoSource,
                timestamp_sec: effectiveTimestamp,
                style_preset: effectiveStyle,
                enable_speedlines: enableSpeedlines,
                frame_count: frameCount,
              },
              { timeout: 180000 }
            );

            sketchImagePath = frameRes.data?.sketch_frame_path;
            sketchFramesPaths = frameRes.data?.sketch_frames || [];
            previewUrl = frameRes.data?.preview_url;
            previewUrls = frameRes.data?.preview_urls || (previewUrl ? [previewUrl] : []);

            updateItem(targetItem.id, {
              phase: 'video',
              imageUrl: previewUrl,
              sketchFrames: sketchFramesPaths.length > 0 ? sketchFramesPaths : undefined,
              previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
            });

            // [Step 2] Remotion 1080x1920 MP4 실물 렌더링 (풀 쇼츠 이어보기 및 펀치라인 자막 100% 동기화)
            const punchlineMarker = targetItem.detectedPunchlineText
              ? `💬 ${targetItem.detectedPunchlineText}`
              : customMarker.trim() || undefined;

            const renderRes = await api.post(
              '/render/stock-motion/render-mp4',
              {
                job_id: `stock_${Date.now()}_${targetItem.index}`,
                title: jobTitle,
                custom_marker: punchlineMarker,
                video_source: frameRes.data?.video_path || videoSource,
                sketch_source: sketchImagePath,
                sketch_frames: sketchFramesPaths.length > 0 ? sketchFramesPaths : undefined,
                timestamp_sec: effectiveTimestamp,
                style_preset: effectiveStyle,
                frame_count: frameCount,
                hold_seconds: holdSeconds,
                duration_mode: durationMode,
                post_continuation_sec: postContinuationSec,
                enable_speedlines: enableSpeedlines,
                include_sfx: includeSfx,
                include_caption: includeCaption,
                archetype: 'classic',
              },
              { timeout: 300000 }
            );

            completedVideoPath = renderRes.data?.video_path;
            streamUrl = renderRes.data?.stream_url;
            responseMeta = renderRes.data;
          }

          updateItem(targetItem.id, {
            status: 'done',
            phase: 'complete',
            videoResultUrl: streamUrl,
            videoPath: completedVideoPath,
            completedAt: new Date().toLocaleTimeString(),
          });

          // 효과음 옵션 켜져있을 시 완료 팝 SFX 오디오 재생
          if (includeSfx) {
            playSynthesizedSfx('sfx_pop_bubble');
          }

          // 전역 완성 큐로 즉시 인계 (하단 완성된 일괄 프로젝트 대기열 직결)
          const newBatchJob = {
            id: responseMeta?.job_id || `stock-motion-${Date.now()}`,
            title: stylePreset === 'whiteboard-stream' ? `[화이트보드] ${jobTitle}` : `[스톡모션] ${jobTitle}`,
            sourceType: 'video',
            archetype: 'classic',
            tabId: 'stock-motion',
            createdAt: new Date().toLocaleTimeString(),
            status: 'done',
            video_path: completedVideoPath,
            stream_url: streamUrl,
            video_filename: responseMeta?.filename,
            file_size_bytes: responseMeta?.file_size_bytes,
            duration_seconds: responseMeta?.duration_seconds,
            subtitles: responseMeta?.subtitles,
            pixeling_meta: responseMeta?.pixeling_meta,
            formatted_pixeling_text: responseMeta?.pixeling_meta?.formatted_text,
            scriptLinesCount: frameCount,
            metadata: {
              sourceUrl: targetItem.sourceUrl,
              stylePreset,
              frameCount,
              holdSeconds,
              paperColor,
              enableStylus,
              enableVoiceoverCarve,
              includeSfx,
              includeCaption,
            },
          };

          onAddBatchJobs([newBatchJob]);
        } catch (err: any) {
          const detailMsg = err.response?.data?.detail || err.message || '스톡모션 생성 중 오류가 발생했습니다.';
          console.error('[StockMotion] Worker error detail:', detailMsg, err);
          updateItem(targetItem.id, {
            status: 'error',
            phase: 'error',
            error: typeof detailMsg === 'object' ? JSON.stringify(detailMsg) : String(detailMsg),
            completedAt: new Date().toLocaleTimeString(),
          });
        } finally {
          processingIdsRef.current.delete(targetItem.id);
        }
      })();
    });
  }, [queue, runningCount, stylePreset, frameCount, holdSeconds, timestampSec, enableSpeedlines, customTitle, customMarker, paperColor, enableStylus, enableVoiceoverCarve, includeSfx, includeCaption, onAddBatchJobs, updateItem]);

  // [골든 하이라이트 Top 3 후보 원클릭 전환 핸들러]
  const handleSelectCandidate = useCallback(
    async (itemId: string, cand: HighlightCandidate) => {
      updateItem(itemId, {
        detectedTimestampSec: cand.timestamp,
        detectedReason: cand.reason,
        detectedPunchlineText: cand.punchline,
      });

      toast({
        title: '⚡ 하이라이트 타이밍 변경',
        description: `${cand.timestamp}s "${cand.punchline || cand.reason}"(으)로 변경되었습니다.`,
      });

      // 영상 소스가 준비되어 있으면 즉시 해당 시점의 스케치 프레임 프리뷰 자동 갱신
      const currentItem = queue.find(q => q.id === itemId);
      const videoSrc = currentItem?.videoPath || currentItem?.sourceUrl;
      if (videoSrc && (currentItem?.status === 'ready' || currentItem?.status === 'waiting')) {
        try {
          const effectiveStyle: StockMotionStyle =
            currentItem.selectedStyle ||
            (stylePreset === 'auto-match'
              ? (currentItem.detectedStyle || 'vintage-comic')
              : stylePreset);

          const frameRes = await api.post(
            '/render/stock-motion/process-frame',
            {
              video_source: videoSrc,
              timestamp_sec: cand.timestamp,
              style_preset: effectiveStyle,
              enable_speedlines: enableSpeedlines,
              frame_count: frameCount,
            },
            { timeout: 180000 }
          );

          if (frameRes.data?.preview_url) {
            updateItem(itemId, {
              imageUrl: frameRes.data.preview_url,
              previewUrls: frameRes.data.preview_urls || [frameRes.data.preview_url],
              sketchFrames: frameRes.data.sketch_frames || [],
            });
          }
        } catch (err) {
          console.warn('[StockMotion] Candidate preview refresh fallback:', err);
        }
      }
    },
    [queue, stylePreset, enableSpeedlines, frameCount, updateItem, toast]
  );

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

  // [버그 수정 완료] 아이템 삭제: 보관함/URL/파일 불문 큐에서 즉시 원자적 제거
  const handleRemoveItem = (item: StockMotionQueueItem) => {
    setQueue(prev => prev.filter(q => q.id !== item.id));
    processingIdsRef.current.delete(item.id);
    analyzingIdsRef.current.delete(item.id);

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
    toast({
      title: '대기열 항목 삭제',
      description: `"${item.label}" 항목이 대기열에서 삭제되었습니다.`,
    });
  };

  // 대기열 전체 비우기 (실행 중 항목 제외)
  const handleClearAll = () => {
    setQueue(prev => prev.filter(q => q.status === 'running'));
    analyzingIdsRef.current.clear();
    setUrlsInput('');
    setLocalFiles([]);
    toast({
      title: '🧹 대기열 비우기 완료',
      description: '실행 중인 작업을 제외한 모든 대기열 항목이 정리되었습니다.',
    });
  };

  // 실패 항목 원클릭 재시도
  const handleRetryFailed = () => {
    setQueue(prev =>
      prev.map(item =>
        item.status === 'error'
          ? {
              ...item,
              status: 'waiting',
              phase: 'image',
              error: undefined,
              startedAt: undefined,
            }
          : item
      )
    );
    toast({
      title: '🔄 실패 항목 재시도',
      description: '실패한 작업들이 대기열에 다시 등록되어 제작이 재개됩니다.',
    });
  };

  // [신규] 대기 상태 항목 일괄 시작
  const handleStartQueue = () => {
    setQueue(prev =>
      prev.map(item => {
        if (item.status === 'ready') {
          return { ...item, status: 'waiting' };
        }
        if (item.status === 'analyzing' || item.isAnalyzingHighlight) {
          return { ...item, autoStartWhenAnalyzed: true };
        }
        return item;
      })
    );
    toast({
      title: '🚀 스톡모션 큐 가동 시작',
      description: '대기 중인 영상들의 렌더링이 순차적으로 시작됩니다.',
    });
  };

  // 보관함 영상 선택 핸들러
  const handleSelectLibraryVideo = (video: any) => {
    const meta = video.metadata || video;
    const rawFp = meta.file_path || meta.video_path || meta.stream_url;
    const rawUrl = meta.url || video.url;
    const rawId = meta.video_id || video.video_id;
    const youtubeUrl = rawId && !String(rawId).startsWith('local_') ? `https://www.youtube.com/shorts/${rawId}` : null;
    const videoSource = rawFp || rawUrl || youtubeUrl;

    if (!videoSource) {
      toast({
        variant: 'destructive',
        title: '재생 가능한 영상 소스 없음',
        description: `"${video.title}" 영상의 로컬 파일이나 온라인 URL을 찾을 수 없습니다.`,
      });
      return;
    }

    const existing = queue.find(q => q.sourceUrl === videoSource || q.label === video.title);
    if (existing) {
      toast({
        title: '이미 등록된 영상입니다',
        description: `"${video.title}" 항목이 이미 대기열에 있습니다.`,
      });
      return;
    }
    if (queue.length >= 20) {
      toast({
        title: '대기열 한도 초과',
        description: '최대 20개 항목까지만 등록할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    const newItem: StockMotionQueueItem = {
      id: `lib:${video.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      index: queue.length + 1,
      kind: 'url',
      label: video.title || '보관함 영상',
      sourceUrl: videoSource,
      videoPath: rawFp || undefined,
      status: autoPeakSync ? 'analyzing' : (autoStart ? 'waiting' : 'ready'),
      isAnalyzingHighlight: autoPeakSync,
    };

    setQueue(prev => [...prev, newItem]);
    toast({
      title: '📁 보관함 영상 추가 완료',
      description: `"${video.title}" 영상이 대기열에 추가되었습니다.`,
    });
    setIsLibraryModalOpen(false);
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
        title: customTitle.trim() || item.label.replace(/\.[^.]+$/g, ''),
        sourceName: item.label,
        sourcePath: item.videoPath || 'video.mp4',
        sourceUrl: item.videoResultUrl || item.sourceUrl,
        timestampSec,
        customMarker: customMarker.trim() || undefined,
        enableSpeedlines,
        stylePreset,
        durationMode,
        postContinuationSec,
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
                    <span>스톡모션 & 화이트보드 올인원 팩토리</span>
                  </h2>
                  <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                    연출 옵션과 듀레이션을 먼저 설정한 뒤, 영상 링크나 파일을 넣으면 2개씩 순서대로 무결점 제작합니다.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-mono px-2.5 py-1',
                    runningCount > 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : readyCount > 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}
                >
                  {runningCount > 0
                    ? `🟢 큐 제작 중 (${runningCount}/2)`
                    : readyCount > 0
                    ? `🟡 시작 대기 (${readyCount}개)`
                    : '⚪ 링크/파일 대기'}
                </Badge>
              </div>
            </div>

            {/* ============================================================ */}
            {/* [1단계: 최상단] 🎨 스톡모션 세부 연출 & 스타일 사전 세팅 */}
            {/* ============================================================ */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>1단계: 연출 옵션 & 그림체 스타일 사전 세팅</span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">PARALLEL: 2 SLOTS</span>
              </div>

              {/* 7대 공인 그림체 스타일 선택 (조회수 폭발 바이럴 신규 3종 포함) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground block">
                  그림체 스타일 프리셋 (7대 공인 스타일)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {STYLE_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setStylePreset(preset.value)}
                      className={cn(
                        'p-2.5 rounded-lg border text-left text-xs transition cursor-pointer font-bold',
                        stylePreset === preset.value
                          ? 'bg-primary/10 border-primary text-primary shadow-2xs ring-1 ring-primary'
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

              {/* 화이트보드 손그림 전용 세부 설정 패널 */}
              {stylePreset === 'whiteboard-stream' && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3 pt-2.5">
                  <div className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      화이트보드 손그림 & Voiceover Carve 전용 옵션
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                      SRT WHITEBOARD
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {/* 종이 배경색 선택 */}
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold text-muted-foreground">캔버스 종이 색상</label>
                      <div className="flex gap-1">
                        {[
                          { hex: '#F5EBD7', label: '웜톤 미색' },
                          { hex: '#FFFFFF', label: '퓨어 화이트' },
                          { hex: '#E8DCC4', label: '빈티지' },
                        ].map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setPaperColor(c.hex)}
                            className={cn(
                              'flex-1 py-1 px-1.5 rounded text-[10px] font-bold border transition cursor-pointer flex items-center justify-center gap-1',
                              paperColor === c.hex
                                ? 'border-primary ring-1 ring-primary text-foreground'
                                : 'border-border bg-background text-muted-foreground hover:bg-muted'
                            )}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                            <span>{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 펜촉/손 트래킹 */}
                    <div className="flex items-center justify-between p-2 rounded border border-border bg-background/80">
                      <div>
                        <div className="text-[11px] font-bold text-foreground">드로잉 펜촉 트래킹</div>
                        <div className="text-[9.5px] text-muted-foreground">펜촉이 획을 따라 이동</div>
                      </div>
                      <Switch checked={enableStylus} onCheckedChange={setEnableStylus} />
                    </div>

                    {/* Voiceover Carve 주파수 덕킹 */}
                    <div className="flex items-center justify-between p-2 rounded border border-border bg-background/80">
                      <div>
                        <div className="text-[11px] font-bold text-foreground">Voiceover Carve</div>
                        <div className="text-[9.5px] text-muted-foreground">400Hz/1kHz 보컬 포먼트 덕킹</div>
                      </div>
                      <Switch checked={enableVoiceoverCarve} onCheckedChange={setEnableVoiceoverCarve} />
                    </div>
                  </div>
                </div>
              )}

              {/* [신규 핵심] 영상 길이(듀레이션) 모드 및 이어보기 설정 */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    영상 길이(듀레이션) 모드 설정
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {durationMode === 'full-continuation' ? '풀 쇼츠 시청지속 최적화' : '훅 씬 전용'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDurationMode('full-continuation')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left text-xs transition cursor-pointer font-bold',
                      durationMode === 'full-continuation'
                        ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                        : 'border-border bg-background hover:bg-muted/40 text-foreground'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>🎬 풀 쇼츠 이어보기 (추천)</span>
                      </div>
                      <Badge variant="outline" className="text-[9.5px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        Retention 극대화
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-1 leading-snug">
                      스톡모션 훅 연출 후, 피크 지점부터 원본 영상이 자연스럽게 이어지는 완성형 쇼츠
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationMode('hook-only')}
                    className={cn(
                      'p-2.5 rounded-lg border text-left text-xs transition cursor-pointer font-bold',
                      durationMode === 'hook-only'
                        ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                        : 'border-border bg-background hover:bg-muted/40 text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ 스톡모션 훅 전용 (3~5초)</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-1 leading-snug">
                      피크 액션 + 스케치 프리즈 + 스톱모션 지터 구간만 추출하는 임팩트 클립
                    </div>
                  </button>
                </div>

                {/* 풀 쇼츠 이어보기 초수 선택 버튼군 */}
                {durationMode === 'full-continuation' && (
                  <div className="p-2.5 rounded-lg border border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-foreground">이어보기 시간 (피크 이후 재생)</span>
                    <div className="flex items-center gap-1">
                      {[10, 15, 20, 30, 45, 60].map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setPostContinuationSec(sec)}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition cursor-pointer',
                            postContinuationSec === sec
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                          )}
                        >
                          +{sec}초
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* [신규 혁신] AI 자동 하이라이트 & 펀치라인 동기화 스위치 */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/60 shadow-xs">
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground">AI 골든 피크 & 펀치라인 자동 동기화</span>
                    <Badge variant="outline" className="text-[9.5px] font-mono text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">Auto-Snap</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Whisper STT 대사 종료점과 오디오 RMS 피크를 0.05초 정밀도로 감지하여 하이라이트에 자석처럼 자동 스냅합니다.
                  </p>
                </div>
                <Switch checked={autoPeakSync} onCheckedChange={setAutoPeakSync} />
              </div>

              {/* 피크 액션 타임스탬프 탐색기 */}
              <div className={cn("space-y-1.5 pt-2 border-t border-border transition-opacity", autoPeakSync && "opacity-80")}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary" />
                    {autoPeakSync ? "수동 오버라이드 타임스탬프 (AI 분석 실패 시 사용)" : "피크 액션 타임스탬프 탐색기"}
                  </span>
                  <span className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md text-xs">
                    {timestampSec.toFixed(1)}초
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={timestampSec}
                  onChange={e => setTimestampSec(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] font-mono text-muted-foreground">
                  <span>0.1s (초반)</span>
                  <span>1.0s (표준)</span>
                  <span>5.0s (중반)</span>
                  <span>10.0s (후반)</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {[0.5, 0.9, 1.5, 2.0, 3.0, 5.0, 8.0].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimestampSec(t)}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition cursor-pointer',
                        timestampSec === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      )}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* 프레임 수 및 홀드 지속 시간 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
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

              {/* 커스텀 타이틀 & 마커 인풋 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground block flex items-center gap-1">
                    <Type className="w-3 h-3 text-primary" />
                    상단 타이틀 (선택 · 빈칸 시 파일명 사용)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="영상 상단에 표시할 제목"
                    maxLength={40}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground block flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    하단 마커 텍스트 (선택 · 빈칸 시 자동)
                  </label>
                  <input
                    type="text"
                    value={customMarker}
                    onChange={e => setCustomMarker(e.target.value)}
                    placeholder="예: 🔥 대박 반전씬!"
                    maxLength={24}
                    className="w-full text-xs p-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition"
                  />
                </div>
              </div>

              {/* 3대 토글 스위치 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-bold text-foreground">만화 집중선</div>
                      <div className="text-[10px] text-muted-foreground">Speedlines</div>
                    </div>
                  </div>
                  <Switch checked={enableSpeedlines} onCheckedChange={setEnableSpeedlines} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">4단 사운드</div>
                      <div className="text-[10px] text-muted-foreground">Whoosh→셔터→팝</div>
                    </div>
                  </div>
                  <Switch checked={includeSfx} onCheckedChange={setIncludeSfx} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <div>
                      <div className="font-bold text-foreground">리액션 배지</div>
                      <div className="text-[10px] text-muted-foreground">하단 마커 자막</div>
                    </div>
                  </div>
                  <Switch checked={includeCaption} onCheckedChange={setIncludeCaption} />
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* [2단계: 중단] 🎬 비디오 소스 추가 (URL / 로컬 파일 / 보관함) */}
            {/* ============================================================ */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>2단계: 비디오 소스 추가 & 제작 발주</span>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">
                    위 연출 옵션이 적용되어 최대 20개까지 2개 슬롯 병렬로 제작됩니다.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* 추가 즉시 자동 시작 토글 */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background text-xs">
                    <span className="text-[11px] font-bold text-muted-foreground">추가 즉시 자동 시작</span>
                    <Switch checked={autoStart} onCheckedChange={setAutoStart} />
                  </div>

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
                    onClick={() => setIsLibraryModalOpen(true)}
                    className="h-8 text-xs font-bold gap-1.5 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <span>보관함 영상 ({videoList.length})</span>
                  </Button>

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

                  {/* 선택 작업 일괄 시작 버튼 */}
                  {(readyCount > 0 || analyzingCount > 0) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartQueue}
                      className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer animate-pulse"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{readyCount > 0 ? `대기 ${readyCount}개 일괄 시작` : `분석 완료 후 자동 시작 (${analyzingCount}개)`}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* 제작 링크 입력 (다중 URL Textarea) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">YouTube Shorts / 비디오 링크 다중 입력</span>
                  <span className="text-[10px] font-mono">한 줄에 하나씩 입력</span>
                </div>
                <textarea
                  value={urlsInput}
                  onChange={e => setUrlsInput(e.target.value)}
                  placeholder="https://www.youtube.com/shorts/... 형태의 링크를 줄바꿈으로 입력 (최대 20개)"
                  rows={2}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition"
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* [3단계: 하단] 📋 작업 대기열 & 결과 관리 (5대 메트릭 + 액션 툴바 + 리스트) */}
            {/* ============================================================ */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-4">
              {/* 대기열 헤더 및 액션 툴바 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary" />
                  <span className="font-bold text-xs text-foreground">3단계: 작업 대기열 & 완성 결과 ({queue.length}/20)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(readyCount > 0 || analyzingCount > 0) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleStartQueue}
                      className="h-7 text-xs font-bold gap-1 text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{readyCount > 0 ? '대기 시작' : '분석 완료 후 시작'}</span>
                    </Button>
                  )}
                  {errorCount > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRetryFailed}
                      className="h-7 text-xs font-bold gap-1 text-destructive border-destructive/40 hover:bg-destructive/10 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>실패 재시도 ({errorCount})</span>
                    </Button>
                  )}
                  {queue.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleClearAll}
                      className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      title="실행 중인 작업을 제외한 모든 대기열 비우기"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>대기열 비우기</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExportManifest}
                    disabled={queue.length === 0}
                    className="h-7 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>매니페스트 JSON</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExportCapcut}
                    disabled={queue.length === 0 || isExportingCapcut}
                    className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                  >
                    <Clapperboard className="w-3 h-3" />
                    <span>{isExportingCapcut ? 'CapCut...' : 'CapCut 초안'}</span>
                  </Button>
                </div>
              </div>

              {/* 5대 메트릭 박스 */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: '전체 작업', value: `${totalCount}/20`, color: 'text-foreground' },
                  { label: '제작 진행', value: `${runningCount}/2`, color: 'text-primary' },
                  { label: '시작 대기', value: analyzingCount > 0 ? `${waitingCount + readyCount} (분석 ${analyzingCount})` : `${waitingCount + readyCount}`, color: 'text-amber-500' },
                  { label: '완료', value: `${doneCount}`, color: 'text-emerald-500' },
                  { label: '실패', value: `${errorCount}`, color: 'text-destructive' },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="rounded-lg border border-border/80 bg-background/60 p-2 text-center shadow-2xs"
                  >
                    <div className="text-[10.5px] font-bold text-muted-foreground">{metric.label}</div>
                    <div className={cn('text-sm font-black font-mono tabular-nums mt-0.5', metric.color)}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* 대기열 실시간 리스트 */}
              {queue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/10 p-6 text-center text-xs text-muted-foreground space-y-1">
                  <Film className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                  <div>2단계에서 영상 링크를 붙여넣거나 파일을 추가하면 대기열에 등록됩니다.</div>
                  <div className="text-[10.5px] opacity-70">
                    최대 20개 대기열 지원 · 0.9초 피크 훅 + 8프레임 Line-Boil 지터 + 풀 쇼츠 이어보기
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {queue.map(item => (
                    <div
                      key={item.id}
                      className={cn(
                        'grid grid-cols-[36px_minmax(0,1fr)_90px_160px_32px] items-center gap-2 rounded-lg border p-2.5 text-xs transition',
                        item.status === 'running'
                          ? 'bg-primary/5 border-primary/40'
                          : item.status === 'done'
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : item.status === 'error'
                          ? 'bg-destructive/5 border-destructive/30'
                          : item.status === 'analyzing' || item.isAnalyzingHighlight
                          ? 'bg-amber-500/5 border-amber-500/40'
                          : 'bg-background border-border'
                      )}
                    >
                      {/* 번호 */}
                      <div className="font-mono font-bold text-muted-foreground text-center">
                        #{String(item.index).padStart(2, '0')}
                      </div>

                      {/* 제목 및 소스 라벨 + AI 감지 하이라이트/스타일 태그 */}
                      <div className="min-w-0 space-y-1">
                        <div className="font-bold text-foreground truncate">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {item.kind === 'url' ? item.sourceUrl : '로컬 비디오 파일'}
                        </div>
                        {/* AI 감지 하이라이트 & 펀치라인 뱃지 */}
                        {item.isAnalyzingHighlight ? (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500 font-mono mt-0.5 animate-pulse">
                            <Sparkles className="w-2.5 h-2.5 animate-spin" />
                            <span>Whisper STT 대사 및 피크 정밀 분석 중...</span>
                          </div>
                        ) : item.detectedTimestampSec ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                ⚡ {item.detectedTimestampSec}s ({item.detectedReason || '골든 피크'})
                              </span>
                              {item.detectedPunchlineText && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={item.detectedPunchlineText}>
                                  💬 "{item.detectedPunchlineText}"
                                </span>
                              )}
                              {/* 개별 항목 전용 스타일 선택기 (독립 제어 보장) */}
                              <div className="inline-flex items-center gap-1">
                                <select
                                  value={item.selectedStyle || (stylePreset === 'auto-match' ? (item.detectedStyle || 'vintage-comic') : stylePreset)}
                                  onChange={(e) => updateItem(item.id, { selectedStyle: e.target.value as StockMotionStyle })}
                                  className="h-5 text-[9.5px] font-semibold bg-background border border-border/80 rounded px-1 text-foreground cursor-pointer focus:ring-1 focus:ring-primary"
                                  title={item.styleReason || '이 영상의 그림체 스타일 선택'}
                                >
                                  {STYLE_PRESETS.filter(p => p.value !== 'auto-match').map(p => (
                                    <option key={p.value} value={p.value}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                                {item.styleReason && (
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[220px]" title={item.styleReason}>
                                    💡 {item.styleReason}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* [신규] Top 3 하이라이트 후보 원클릭 전환 버튼 바 */}
                            {item.highlightCandidates && item.highlightCandidates.length > 1 && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                <span className="text-[9.5px] font-bold text-muted-foreground flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                  타이밍 후보:
                                </span>
                                {item.highlightCandidates.slice(0, 3).map((cand, idx) => {
                                  const isSelected = Math.abs((item.detectedTimestampSec ?? 0) - cand.timestamp) < 0.05;
                                  return (
                                    <button
                                      key={`${cand.timestamp}-${idx}`}
                                      type="button"
                                      onClick={() => handleSelectCandidate(item.id, cand)}
                                      className={cn(
                                        "h-5 px-1.5 text-[9.5px] rounded border font-mono transition-all flex items-center gap-1 cursor-pointer",
                                        isSelected
                                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                          : "bg-muted/70 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                                      )}
                                      title={`${idx + 1}순위 (${cand.score}점): ${cand.reason} - "${cand.punchline}"`}
                                    >
                                      <span className="font-semibold opacity-90">{idx + 1}순위 {cand.timestamp}s</span>
                                      {cand.punchline && (
                                        <span className="truncate max-w-[120px] hidden sm:inline opacity-80">
                                          "{cand.punchline}"
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* 상태 및 진행 단계 */}
                      <div>
                        {item.status === 'analyzing' || item.isAnalyzingHighlight ? (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit animate-pulse">
                            <Sparkles className="w-2.5 h-2.5 animate-spin" />
                            <span>분석 중</span>
                          </Badge>
                        ) : item.status === 'running' ? (
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
                        ) : item.status === 'ready' ? (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 w-fit">
                            시작 대기
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border w-fit">
                            큐 대기
                          </Badge>
                        )}
                      </div>

                      {/* 미리보기 / 액션 버튼군 */}
                      <div className="flex items-center gap-1.5 justify-end">
                        {item.imageUrl && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPreviewTargetItem(item);
                              setPreviewSketchUrl(item.imageUrl || null);
                            }}
                            className="h-6 px-2 text-[10.5px] font-bold gap-1 text-primary border-primary/40 hover:bg-primary/10 cursor-pointer"
                            title="스케치 프레임 원본 보기"
                          >
                            <Eye className="w-3 h-3" />
                            <span>스케치</span>
                          </Button>
                        )}
                        {item.videoResultUrl && (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setPreviewTargetItem(item);
                              setPreviewVideoModalUrl(item.videoResultUrl || null);
                            }}
                            className="h-6 px-2 text-[10.5px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                            title="1080x1920 MP4 실물 영상 즉시 재생"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>영상 재생</span>
                          </Button>
                        )}
                        {!item.imageUrl && !item.videoResultUrl && (
                          item.status === 'analyzing' || item.isAnalyzingHighlight ? (
                            <span className="text-[10px] font-medium text-amber-500 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 animate-spin" />
                              분석 중
                            </span>
                          ) : item.kind === 'file' && item.file ? (
                            <span className="text-[10px] font-mono text-muted-foreground">{(item.file.size / 1024 / 1024).toFixed(1)}MB</span>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground">대기</span>
                          )
                        )}
                      </div>

                      {/* 삭제 버튼 [100% 정상 작동 보장] */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition cursor-pointer"
                        title="대기열에서 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* 에러 상세 메시지 표시 */}
                      {item.error && (
                        <div className="col-span-5 text-[10.5px] text-destructive bg-destructive/10 rounded p-1.5 mt-1">
                          {item.error}
                        </div>
                      )}

                      {/* 8-프레임 Line-Boil 필름스트립 시각화 패널 */}
                      {item.previewUrls && item.previewUrls.length > 0 && !item.isAnalyzingHighlight && item.status !== 'analyzing' && (
                        <div className="col-span-5 mt-2">
                          <div className="text-[9.5px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
                            <Film className="w-3 h-3" />
                            8-프레임 Line-Boil 필름스트립
                          </div>
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {item.previewUrls.map((url, fi) => (
                              <div
                                key={fi}
                                className="shrink-0 w-12 h-12 rounded border border-border overflow-hidden bg-muted/30 relative"
                                title={`프레임 ${fi + 1}`}
                              >
                                <img
                                  src={url}
                                  alt={`frame-${fi + 1}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                                <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-mono font-bold bg-black/60 text-white leading-tight py-px">
                                  F{fi + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                  <span className="font-mono font-bold text-foreground">{timestampSec.toFixed(1)}초 ({Math.round(timestampSec * 1000)}ms)</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>2. 스케치 프리즈</span>
                  <span className="font-mono font-bold text-foreground">{holdSeconds.toFixed(1)}초 ({Math.round(holdSeconds * 1000)}ms)</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>3. 스톱모션 지터 ({frameCount}장)</span>
                  <span className="font-mono font-bold text-foreground">{((frameCount * 160) / 1000).toFixed(2)}초 ({frameCount * 160}ms)</span>
                </div>
                {durationMode === 'full-continuation' && (
                  <div className="flex justify-between items-center text-primary font-bold">
                    <span>4. 풀 쇼츠 이어보기</span>
                    <span className="font-mono">+{postContinuationSec.toFixed(1)}초 ({Math.round(postContinuationSec * 1000)}ms)</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex justify-between items-center font-bold">
                  <span className="text-foreground">총 쇼츠 완성본 길이:</span>
                  <span className="font-mono text-sm text-primary font-black">
                    {(
                      (Math.round(timestampSec * 1000) +
                        Math.max(800, Math.round(holdSeconds * 1000)) +
                        frameCount * 160 +
                        (durationMode === 'full-continuation' ? Math.round(postContinuationSec * 1000) : 0)) /
                      1000
                    ).toFixed(2)}초
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

        {/* ── 보관함 영상 불러오기 모달 ── */}
        {isLibraryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-xl max-w-xl w-full p-5 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">미디어 보관함 영상 불러오기</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                다운로드 보관함(07_Downloads)에 보관된 비디오를 선택하여 스톡모션 제작 대기열에 바로 등록합니다.
              </p>

              <div className="overflow-y-auto flex-1 space-y-2 pr-1 min-h-[240px] max-h-[380px]">
                {videoList.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                    <Film className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                    보관함에 등록된 영상이 없습니다.
                  </div>
                ) : (
                  videoList.map(v => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/40 transition gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-foreground truncate">{v.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{v.sourceOrigin || '로컬 보관함'}</span>
                          {v.dateText && <span>· {v.dateText}</span>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSelectLibraryVideo(v)}
                        className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>선택</span>
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border pt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLibraryModalOpen(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 골든 피크 스케치 프레임 확대 모달 ── */}
        {previewSketchUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            onClick={() => {
              setPreviewSketchUrl(null);
              setPreviewTargetItem(null);
            }}
          >
            <div
              className="bg-card border border-border rounded-xl max-w-md w-full p-4 shadow-xl space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h4 className="font-bold text-xs text-foreground">
                    추출된 스케치 프레임 ({previewTargetItem?.detectedTimestampSec ?? timestampSec}s 골든 피크)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewSketchUrl(null);
                    setPreviewTargetItem(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-9/16 max-h-[480px] flex items-center justify-center">
                <img
                  src={previewSketchUrl}
                  alt="Stock Motion Sketch"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1 text-center">
                <div className="text-[11px] text-muted-foreground">
                  FFmpeg {previewTargetItem?.detectedTimestampSec ?? timestampSec}s 피크 추출 + OpenCV {STYLE_PRESETS.find(p => p.value === (previewTargetItem?.selectedStyle || previewTargetItem?.detectedStyle || stylePreset))?.label || '그림체'} 정밀 렌더링
                </div>
                {previewTargetItem?.styleReason && (
                  <div className="text-[10px] font-semibold text-primary/90 bg-primary/10 rounded px-2 py-0.5 inline-block">
                    💡 {previewTargetItem.styleReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 1080x1920 MP4 실물 영상 미리보기 모달 ── */}
        {previewVideoModalUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
            onClick={() => {
              setPreviewVideoModalUrl(null);
              setPreviewTargetItem(null);
            }}
          >
            <div
              className="bg-card border border-border rounded-xl max-w-sm w-full p-4 shadow-2xl space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500 fill-current" />
                  <h4 className="font-bold text-xs text-foreground">스톡모션 완성본 실물 재생 (1080x1920)</h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewVideoModalUrl(null);
                    setPreviewTargetItem(null);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-9/16 max-h-[500px] flex items-center justify-center">
                <video
                  src={previewVideoModalUrl}
                  autoPlay
                  loop
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-[11px] text-muted-foreground text-center space-y-0.5 font-mono">
                <div className="text-foreground font-bold">
                  {previewTargetItem?.detectedTimestampSec ?? timestampSec}s 액션 피크 ➔ {holdSeconds.toFixed(1)}s 스케치 프리즈 ➔ {frameCount}프레임 지터
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">1080x1920 Remotion 헤드리스 실물 MP4 렌더링 완결본 (무한 반복 재생)</div>
              </div>
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  );
};
