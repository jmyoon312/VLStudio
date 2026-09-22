import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music,
  Upload,
  Sparkles,
  Sliders,
  Volume2,
  Disc,
  Play,
  Pause,
  Clock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  AlignLeft,
  FileAudio,
  Plus,
  Trash2,
  ExternalLink,
  Film,
  Download,
  FileVideo,
  Globe2,
  Loader2,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import api from '@/lib/api';
import { GLOBAL_LANGUAGES } from '@/types/ddalkkak';
import { BatchWorkQueueSection, BatchWorkItem } from '../onetake/BatchWorkQueueSection';
import { VideoPreviewModal } from '@/components/shared/VideoPreviewModal';
import { WorkItemDetailModal } from '../onetake/WorkItemDetailModal';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';

export interface SongLyricLine {
  id: string;
  startMs: number;
  endMs: number;
  original: string;
  pronunciation?: string;
  meaning?: string;
}

export type SongVisualTheme = 'vinyl' | 'visualizer' | 'jacket' | 'poster';

export interface SourceItem {
  id: string;
  title: string;
  snippet: string;
  sourceOrigin: string;
  dateText: string;
  metadata?: any;
}

interface SongBatchTabProps {
  videoList?: SourceItem[];
  scriptList?: SourceItem[];
  onAddBatchJobs?: (jobs: any[]) => void;
}

export const SongBatchTab: React.FC<SongBatchTabProps> = ({
  videoList = [],
  scriptList = [],
  onAddBatchJobs
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── 1. 곡 기본 정보 및 음원 소스 ──
  const [songTitle, setSongTitle] = useState<string>('Golden Hour');
  const [artistName, setArtistName] = useState<string>('JVKE');
  const [audioSourceUrl, setAudioSourceUrl] = useState<string>('');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedVideoPath, setSelectedVideoPath] = useState<string>('');

  // ── 2. 3-Track 활성화 및 옵션 ──
  const [enableOriginal, setEnableOriginal] = useState<boolean>(true);
  const [enablePronunciation, setEnablePronunciation] = useState<boolean>(true);
  const [enableMeaning, setEnableMeaning] = useState<boolean>(true);
  const [targetLang, setTargetLang] = useState<string>('ko');
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);
  const [visualTheme, setVisualTheme] = useState<SongVisualTheme>('vinyl');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // ── 3. 가사 데이터 ──
  const [lyrics, setLyrics] = useState<SongLyricLine[]>([
    { id: 'song-1', startMs: 0, endMs: 3500, original: 'It was just two lovers', pronunciation: '잇 워즈 저스트 투 러버스', meaning: '그저 사랑하는 두 사람이었어' },
    { id: 'song-2', startMs: 3500, endMs: 7200, original: "Sittin' in the car, listenin' to Blonde", pronunciation: '시틴 인 더 카, 리스닌 투 블론드', meaning: '차 안에 앉아 Blonde 앨범을 들으며' },
    { id: 'song-3', startMs: 7200, endMs: 10800, original: 'Fallin\' for each other', pronunciation: '폴린 포 이치 아더', meaning: '서로에게 깊이 빠져들었지' },
    { id: 'song-4', startMs: 10800, endMs: 14500, original: 'Pink and orange skies, feelin\' super alive', pronunciation: '핑크 앤 오렌지 스카이즈, 필린 슈퍼 얼라이브', meaning: '분홍빛과 주황빛 노을 아래, 온몸이 살아있음을 느껴' },
    { id: 'song-5', startMs: 14500, endMs: 20000, original: 'You look like the golden hour', pronunciation: '유 룩 라이크 더 골든 아워', meaning: '넌 마치 황금빛 노을 같아' },
  ]);

  // ── 4. 실행 상태 및 대기열 ──
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  
  // ── 5. 대기열 작업 목록 및 모달 상태 ──
  const [workQueueItems, setWorkQueueItems] = useState<BatchWorkItem[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<{
    title: string;
    videoUrl?: string;
    filePath?: string;
    videoData?: any;
    sourceType?: 'queue';
  } | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [detailWorkItem, setDetailWorkItem] = useState<BatchWorkItem | null>(null);

  // ── 6. 미리보기 플레이어 시뮬레이션 상태 ──
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewCurrentMs, setPreviewCurrentMs] = useState<number>(0);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 미리보기 타이머 재생/일시정지
  useEffect(() => {
    if (isPlayingPreview) {
      const startTime = Date.now() - previewCurrentMs;
      previewTimerRef.current = setInterval(() => {
        const nextMs = Date.now() - startTime;
        const maxDurationMs = lyrics.length > 0 ? lyrics[lyrics.length - 1].endMs + 1000 : 20000;
        if (nextMs >= maxDurationMs) {
          setPreviewCurrentMs(0);
        } else {
          setPreviewCurrentMs(nextMs);
        }
      }, 50);
    } else {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    }
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, [isPlayingPreview, lyrics]);

  // 현재 재생 중인 가사 라인
  const activeLyric = useMemo(() => {
    return lyrics.find(l => previewCurrentMs >= l.startMs && previewCurrentMs < l.endMs) || lyrics[0];
  }, [lyrics, previewCurrentMs]);

  // 파일 업로드 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAudioFileName(file.name);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      setSongTitle(cleanTitle);
      setSelectedVideoPath('');
      toast({
        title: '🎵 음원/영상 파일 선택 완료',
        description: `'${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) 파일이 로드되었습니다.`
      });
    }
  };

  // 보관함 소스 빠른 선택 핸들러
  const handleSelectFromVideoList = (item: SourceItem) => {
    const filePath = item.metadata?.file_path || item.snippet;
    setSelectedVideoPath(filePath);
    setSelectedFile(null);
    setAudioFileName(item.title);
    setSongTitle(item.title);
    toast({
      title: '📁 보관함 소스 선택',
      description: `'${item.title}' 영상이 노래형 소스로 지정되었습니다.`
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ✨ 실제 Faster-Whisper + DB Settings LLM 3-Track 가사 분석 실행
  // ─────────────────────────────────────────────────────────────────────────
  const handleAutoTranscribeLyrics = async () => {
    if (!selectedFile && !selectedVideoPath && !audioSourceUrl.trim()) {
      toast({
        variant: 'destructive',
        title: '음원 소스 필요',
        description: '로컬 파일 업로드, 유튜브 링크 또는 보관함 영상을 선택해주세요.'
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress('Faster-Whisper 음성인식 가사 추출 중...');

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (selectedVideoPath) {
        formData.append('file_path', selectedVideoPath);
      } else if (audioSourceUrl) {
        formData.append('source_url', audioSourceUrl);
      }

      formData.append('source_name', songTitle || audioFileName || 'song');
      formData.append('language', 'auto');
      formData.append('translation_lang', targetLang);
      if (customPrompt.trim()) {
        formData.append('custom_instruction', customPrompt.trim());
      }

      setAnalysisProgress('DB Settings LLM 3-Track 발음 & 번역 동시 생성 중...');
      const response = await api.post('/api/song/transcribe-3track', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });

      const resData = response.data?.data;
      if (resData && Array.isArray(resData.lines) && resData.lines.length > 0) {
        setLyrics(resData.lines);
        toast({
          title: '✨ 3중 트랙 가사 분석 완결',
          description: `Faster-Whisper 및 LLM을 통해 총 ${resData.lines.length}개 가사 라인의 원문, 발음, 번역이 생성되었습니다.`
        });
      } else {
        throw new Error('가사 세그먼트가 추출되지 않았습니다.');
      }
    } catch (err: any) {
      console.error('[SongBatchTab] Transcription error:', err);
      toast({
        variant: 'destructive',
        title: '가사 분석 실패',
        description: err.response?.data?.detail || err.message || '가사 분석 중 오류가 발생했습니다.'
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 🚀 노래형 일괄 렌더링 및 대기열 등록 (Remotion MP4 + CapCut Draft)
  // ─────────────────────────────────────────────────────────────────────────
  const handleStartSongBatch = async () => {
    if (lyrics.length === 0) {
      toast({ variant: 'destructive', title: '가사 없음', description: '생성할 가사 라인이 없습니다.' });
      return;
    }

    setIsRendering(true);
    const jobId = `song-${Date.now()}`;
    const durationSeconds = Math.max(10, Math.ceil(lyrics[lyrics.length - 1].endMs / 1000));

    try {
      // 1. Remotion MP4 실물 렌더링 요청
      const renderForm = new FormData();
      renderForm.append('project_id', jobId);
      renderForm.append('song_title', songTitle);
      renderForm.append('artist_name', artistName);
      renderForm.append('visual_theme', visualTheme);
      renderForm.append('lyrics_json', JSON.stringify(lyrics));
      renderForm.append('enable_original', String(enableOriginal));
      renderForm.append('enable_pronunciation', String(enablePronunciation));
      renderForm.append('enable_meaning', String(enableMeaning));
      renderForm.append('sync_offset_ms', String(syncOffsetMs));
      renderForm.append('duration_seconds', String(durationSeconds));

      if (selectedVideoPath) {
        renderForm.append('video_source', selectedVideoPath);
      }

      toast({
        title: '🎬 Remotion 실물 렌더링 시작',
        description: `'${songTitle}' 1080x1920 MP4 비디오 렌더링이 시작되었습니다.`
      });

      const renderRes = await api.post('/api/song/render-song-shorts', renderForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000
      });

      const videoPath = renderRes.data?.video_path || '';

      // 2. BatchWorkItem 생성
      const newWorkItem: BatchWorkItem = {
        id: jobId,
        title: `[노래형] ${songTitle} - ${artistName}`,
        archetype: 'classic',
        sourceType: 'video',
        status: 'completed',
        progress: 100,
        createdAt: new Date().toLocaleTimeString(),
        sourceOrigin: audioSourceUrl || audioFileName || '로컬 음원 소스',
        subtitlesCount: lyrics.length,
        videoPath: videoPath,
        exportPath: videoPath,
        renderEngine: 'remotion',
        lyricsData: lyrics,
        pixelingMeta: {
          title: `[가사/해석] ${songTitle} - ${artistName} 쇼츠`,
          description: `${songTitle} 3중 트랙 가사 (원어, 발음, 한국어 뜻 번역) #shorts #${songTitle.replace(/\s+/g, '')} #${artistName.replace(/\s+/g, '')}`,
          hashtags: `#${songTitle.replace(/\s+/g, '')} #${artistName.replace(/\s+/g, '')} #가사해석 #음악쇼츠`
        }
      };

      setWorkQueueItems(prev => [newWorkItem, ...prev]);
      if (onAddBatchJobs) {
        onAddBatchJobs([newWorkItem]);
      }

      toast({
        title: '🎉 노래형 쇼츠 제작 완료',
        description: `1080x1920 MP4 영상이 성공적으로 렌더링되어 대기열에 등록되었습니다.`
      });
    } catch (err: any) {
      console.error('[SongBatchTab] Render error:', err);
      toast({
        variant: 'destructive',
        title: '쇼츠 생성 실패',
        description: err.response?.data?.detail || err.message || '렌더링 중 오류가 발생했습니다.'
      });
    } finally {
      setIsRendering(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 📦 CapCut 1-클릭 3-Track 초안 내보내기 핸들러
  // ─────────────────────────────────────────────────────────────────────────
  const handleExportCapCut = async (item: BatchWorkItem) => {
    try {
      const lyricsToExport: SongLyricLine[] = (item as any).lyricsData || lyrics;
      const totalDur = lyricsToExport.length > 0 ? lyricsToExport[lyricsToExport.length - 1].endMs + 1000 : 30000;

      const originalItems = lyricsToExport.map((l, i) => ({
        id: `song-orig-${i + 1}`,
        text: l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 32,
        textColor: '#FFFFFF',
        yPct: 60
      }));

      const pronItems = lyricsToExport.map((l, i) => ({
        id: `song-pron-${i + 1}`,
        text: l.pronunciation || l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 26,
        textColor: '#34D399',
        yPct: 68
      }));

      const meanItems = lyricsToExport.map((l, i) => ({
        id: `song-mean-${i + 1}`,
        text: l.meaning || l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 36,
        textColor: '#FFE500',
        yPct: 76
      }));

      const res = await exportCapCutFullProject({
        projectName: item.title.replace(/[\\/*?:"<>|]/g, '_'),
        durationMs: totalDur,
        video: {
          path: item.videoPath || item.exportPath,
          durationMs: totalDur
        },
        songMode: true,
        song3Tracks: {
          original: originalItems,
          pronunciation: pronItems,
          translation: meanItems
        },
        subtitles: originalItems,
        audios: []
      });

      if (res.success) {
        toast({
          title: '🎬 CapCut 3-Track 초안 내보내기 완료',
          description: `원어·발음·한국어 3개 독립 트랙이 포함된 CapCut 프로젝트가 성공적으로 생성되었습니다.`
        });
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'CapCut 내보내기 실패',
        description: e.message || '초안 내보내기 중 오류가 발생했습니다.'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── ZONE 1 (좌측 4칸): 음원 투입 및 3-Track 엔진 설정 ── */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-primary" />
              음원 소스 및 3-Track 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              PIXELING SPEC
            </Badge>
          </div>

          {/* 음원 파일 업로드 및 유튜브 링크 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">
              음원/영상 파일 (MP3, WAV, M4A, MP4)
            </label>
            <label className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{audioFileName || '오디오/비디오 파일 선택'}</span>
              <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="text-[10px] text-center text-muted-foreground font-medium">또는 유튜브 음악 링크</div>
            <input
              type="text"
              value={audioSourceUrl}
              onChange={e => {
                setAudioSourceUrl(e.target.value);
                setSelectedFile(null);
                setSelectedVideoPath('');
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 보관함 영상 빠른 선택 버튼군 */}
          {videoList.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-[10px] font-bold text-muted-foreground block">보관함 영상에서 빠른 선택</label>
              <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
                {videoList.slice(0, 4).map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectFromVideoList(v)}
                    className={cn(
                      "w-full text-left p-1.5 rounded text-[11px] truncate transition flex items-center gap-1.5",
                      selectedVideoPath === (v.metadata?.file_path || v.snippet)
                        ? "bg-primary/15 text-primary font-bold border border-primary/30"
                        : "hover:bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <FileVideo className="w-3 h-3 shrink-0" />
                    <span className="truncate">{v.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 곡명 및 아티스트 */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">곡 제목</label>
              <input
                type="text"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">아티스트</label>
              <input
                type="text"
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background"
              />
            </div>
          </div>

          {/* 3중 트랙 레이어 토글 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">3중 트랙 활성화 레이어</label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  원어 가사 (영어/외국어 원문)
                </span>
                <input
                  type="checkbox"
                  checked={enableOriginal}
                  onChange={e => setEnableOriginal(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  한글 발음 표기 (소리나는 대로)
                </span>
                <input
                  type="checkbox"
                  checked={enablePronunciation}
                  onChange={e => setEnablePronunciation(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  한국어 뜻 번역 (자연스러운 의역)
                </span>
                <input
                  type="checkbox"
                  checked={enableMeaning}
                  onChange={e => setEnableMeaning(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 번역 타겟 언어 및 싱크 오프셋 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">번역 타겟 언어:</span>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                className="text-xs p-1 rounded border border-border bg-background"
              >
                {GLOBAL_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-foreground">가사 싱크 오프셋:</span>
              <span className="font-mono text-primary font-bold">{syncOffsetMs > 0 ? `+${syncOffsetMs}` : syncOffsetMs} ms</span>
            </div>
            <input
              type="range"
              min="-500"
              max="500"
              step="50"
              value={syncOffsetMs}
              onChange={e => setSyncOffsetMs(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* 비주얼 캔버스 테마 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-muted-foreground block">비주얼 캔버스 테마</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'vinyl', label: 'LP판 회전 애니', icon: Disc },
                { id: 'visualizer', label: '오디오 스펙트럼', icon: Volume2 },
                { id: 'jacket', label: '블러 자켓 카드', icon: Sparkles },
                { id: 'poster', label: '타이포 포스터', icon: AlignLeft },
              ].map(th => {
                const Icon = th.icon;
                const isSel = visualTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setVisualTheme(th.id as any)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition cursor-pointer flex items-center gap-1.5",
                      isSel ? "bg-primary/10 border-primary text-primary font-bold" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── ZONE 2 & 3 (중앙 및 우측 8칸): 3-Track 가사 편집기 & 실시간 프리뷰 ── */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* 가사 테이블 헤더 및 액션 버튼 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">3중 트랙 가사 타임코드 싱크 매트릭스 ({lyrics.length}줄)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isAnalyzing}
                  onClick={handleAutoTranscribeLyrics}
                  className="h-8 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{isAnalyzing ? (analysisProgress || 'AI 분석 중...') : 'AI 3-Track 가사 싱크 자동 분석'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const lastEnd = lyrics.length > 0 ? lyrics[lyrics.length - 1].endMs : 0;
                    setLyrics(prev => [
                      ...prev,
                      {
                        id: `song-${prev.length + 1}`,
                        startMs: lastEnd,
                        endMs: lastEnd + 3000,
                        original: 'New lyric line',
                        pronunciation: '새로운 가사 라인',
                        meaning: '새로운 가사 해석'
                      }
                    ]);
                  }}
                  className="h-8 px-2 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="새 가사 라인 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>행 추가</span>
                </Button>
              </div>
            </div>

            {/* 가사 테이블 목록 */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-2 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground">
                <div className="col-span-2 flex items-center gap-1"><Clock className="w-3 h-3" /> 싱크(초)</div>
                <div className="col-span-4">원어 가사 (Original)</div>
                <div className="col-span-3">한글 발음 (Pronunciation)</div>
                <div className="col-span-2">한국어 번역 (Meaning)</div>
                <div className="col-span-1 text-center">삭제</div>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar">
                {lyrics.map((line, idx) => {
                  const isActive = activeLyric?.id === line.id;
                  return (
                    <div
                      key={line.id}
                      className={cn(
                        "grid grid-cols-12 gap-2 p-2 text-xs items-center transition",
                        isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/20"
                      )}
                    >
                      <div className="col-span-2 font-mono text-[11px] text-primary font-bold flex items-center gap-1">
                        <span>{(line.startMs / 1000).toFixed(1)}s</span>
                        <span className="text-muted-foreground text-[9px]">~</span>
                        <span>{(line.endMs / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={line.original}
                          onChange={e => {
                            const val = e.target.value;
                            setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, original: val } : l));
                          }}
                          className="w-full p-1.5 rounded border border-border bg-background text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          value={line.pronunciation || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, pronunciation: val } : l));
                          }}
                          className="w-full p-1.5 rounded border border-border bg-background text-xs text-emerald-600 dark:text-emerald-400 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={line.meaning || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, meaning: val } : l));
                          }}
                          className="w-full p-1.5 rounded border border-border bg-background text-xs text-foreground font-medium"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setLyrics(prev => prev.filter((_, i) => i !== idx))}
                          className="h-6 w-6 text-muted-foreground hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3중 자막 9:16 실시간 비주얼 프리뷰 캔버스 */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between w-full">
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  9:16 캔버스 실시간 가사 렌더 프리뷰
                </Badge>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {(previewCurrentMs / 1000).toFixed(1)}s
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="h-6 px-2 text-[10px] gap-1 cursor-pointer border-border hover:bg-muted"
                  >
                    {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingPreview ? '정지' : '재생 시뮬레이션'}</span>
                  </Button>
                </div>
              </div>

              {/* 캔버스 화면 시뮬레이션 */}
              <div className="w-full max-w-sm py-4 px-3 rounded-lg bg-black/80 border border-border/80 shadow-inner space-y-2">
                <div className="text-[10px] text-primary/80 font-bold uppercase tracking-wider">
                  🎵 {songTitle} - {artistName} • [{visualTheme.toUpperCase()}]
                </div>

                <div className="space-y-1.5 py-2">
                  {enableOriginal && (
                    <div className="text-sm font-black text-white tracking-wide drop-shadow-md">
                      {activeLyric?.original || '가사를 입력하거나 AI 분석을 실행하세요'}
                    </div>
                  )}
                  {enablePronunciation && activeLyric?.pronunciation && (
                    <div className="text-xs font-bold text-emerald-400 font-mono tracking-tight">
                      {activeLyric.pronunciation}
                    </div>
                  )}
                  {enableMeaning && activeLyric?.meaning && (
                    <div className="text-xs text-amber-300 font-semibold">
                      {activeLyric.meaning}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 일괄 쇼츠 생성 실행 버튼 */}
          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isRendering || lyrics.length === 0}
              onClick={handleStartSongBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
              <span>{isRendering ? 'Remotion 1080x1920 MP4 비디오 렌더링 중...' : '노래형 3-Track 일괄 쇼츠 생성 (실물 렌더링 & CapCut 초안)'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── ZONE 4 (하단 전체): 완성된 일괄 생성 작업 대기열 모니터링 ── */}
      <div className="pt-2">
        <BatchWorkQueueSection
          items={workQueueItems}
          selectedIds={selectedQueueIds}
          onToggleSelect={(id) => {
            setSelectedQueueIds(prev =>
              prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
          }}
          onToggleSelectAll={() => {
            if (selectedQueueIds.length === workQueueItems.length) {
              setSelectedQueueIds([]);
            } else {
              setSelectedQueueIds(workQueueItems.map(i => i.id));
            }
          }}
          onPlayItem={(item) => {
            setPreviewData({
              title: item.title,
              videoUrl: item.videoPath ? getMediaUrl(item.videoPath) : undefined,
              filePath: item.videoPath,
              sourceType: 'queue',
              videoData: item
            });
            setPreviewModalOpen(true);
          }}
          onViewDetail={(item) => {
            setDetailWorkItem(item);
            setDetailModalOpen(true);
          }}
          onEditNle={(item) => {
            navigate('/pro-editor', { state: { project: item } });
          }}
          onExportCapcut={handleExportCapCut}
          onDeleteItem={(id) => {
            setWorkQueueItems(prev => prev.filter(i => i.id !== id));
            setSelectedQueueIds(prev => prev.filter(i => i !== id));
            toast({ title: '항목 삭제', description: '대기열에서 프로젝트가 제거되었습니다.' });
          }}
          onBulkExportCapcut={async () => {
            const targets = workQueueItems.filter(i => selectedQueueIds.includes(i.id));
            for (const t of targets) {
              await handleExportCapCut(t);
            }
          }}
          onBulkDelete={() => {
            setWorkQueueItems(prev => prev.filter(i => !selectedQueueIds.includes(i.id)));
            setSelectedQueueIds([]);
            toast({ title: '일괄 삭제', description: '선택한 프로젝트가 대기열에서 제거되었습니다.' });
          }}
          onRefresh={() => {
            toast({ title: '대기열 갱신', description: '최신 작업 상태가 동기화되었습니다.' });
          }}
        />
      </div>

      {/* ── 모달 다이얼로그 ── */}
      <VideoPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        title={previewData?.title || '노래형 쇼츠 비디오 미리보기'}
        videoUrl={previewData?.videoUrl}
        filePath={previewData?.filePath}
        sourceType={previewData?.sourceType}
        videoData={previewData?.videoData}
        onOpenEditor={() => previewData?.videoData && navigate('/pro-editor', { state: { project: previewData.videoData } })}
        onExportCapcut={previewData?.videoData ? () => handleExportCapCut(previewData.videoData) : undefined}
      />

      <WorkItemDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        item={detailWorkItem}
        onPlay={(item) => {
          setPreviewData({
            title: item.title,
            videoUrl: item.videoPath ? getMediaUrl(item.videoPath) : undefined,
            filePath: item.videoPath,
            sourceType: 'queue',
            videoData: item
          });
          setPreviewModalOpen(true);
        }}
        onEditNle={(item) => navigate('/pro-editor', { state: { project: item } })}
        onExportCapcut={handleExportCapCut}
      />
    </div>
  );
};

export default SongBatchTab;
