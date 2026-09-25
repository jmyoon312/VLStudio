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
  SlidersHorizontal,
  Image as ImageIcon,
  Scissors,
  Palette
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
  const [extractedAudioPath, setExtractedAudioPath] = useState<string>('');

  // ── 1-1. 커스텀 앨범 커버 자켓 ──
  const [albumCoverFile, setAlbumCoverFile] = useState<File | null>(null);
  const [albumCoverPreview, setAlbumCoverPreview] = useState<string>('');

  // ── 1-2. 쇼츠 하이라이트 구간 트리밍 ──
  const [isTrimmingEnabled, setIsTrimmingEnabled] = useState<boolean>(false);
  const [trimStartSecs, setTrimStartSecs] = useState<number>(0);
  const [trimEndSecs, setTrimEndSecs] = useState<number>(60);

  // ── 2. 3-Track 활성화 및 옵션 ──
  const [enableOriginal, setEnableOriginal] = useState<boolean>(true);
  const [enablePronunciation, setEnablePronunciation] = useState<boolean>(true);
  const [enableMeaning, setEnableMeaning] = useState<boolean>(true);
  const [targetLang, setTargetLang] = useState<string>('ko');
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0);
  const [visualTheme, setVisualTheme] = useState<SongVisualTheme>('vinyl');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // ── 2-1. 3-Track 자막 스타일 & 위치 인스펙터 ──
  const [colorPreset, setColorPreset] = useState<'modern' | 'neon' | 'minimal' | 'pastel'>('modern');
  const [textPosition, setTextPosition] = useState<'bottom' | 'middle' | 'top'>('bottom');

  const COLOR_PRESETS = {
    modern: { name: 'K-POP 모던', orig: '#FFFFFF', pron: '#34D399', mean: '#FBBF24' },
    neon: { name: '사이버 네온', orig: '#22D3EE', pron: '#E879F9', mean: '#FDE047' },
    minimal: { name: '클래식 미니멀', orig: '#F8FAFC', pron: '#94A3B8', mean: '#E2E8F0' },
    pastel: { name: '로맨틱 파스텔', orig: '#F472B6', pron: '#A78BFA', mean: '#6EE7B7' }
  };

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

  // ── 5-1. 가사 일괄 붙여넣기(LRC/텍스트) 모달 상태 ──
  const [pasteModalOpen, setPasteModalOpen] = useState<boolean>(false);
  const [pastedLyricsText, setPastedLyricsText] = useState<string>('');

  const handleApplyPastedLyrics = () => {
    if (!pastedLyricsText.trim()) {
      toast({ variant: 'destructive', title: '입력 내용 없음', description: '붙여넣을 가사 텍스트를 입력해주세요.' });
      return;
    }

    const rawLines = pastedLyricsText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedLyrics: SongLyricLine[] = [];
    const lrcRegex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;

    let currentTimeMs = 0;
    let hasLrcTags = false;

    rawLines.forEach((line, idx) => {
      const match = line.match(lrcRegex);
      if (match) {
        hasLrcTags = true;
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msStr = match[3] || '0';
        const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
        const startMs = (min * 60 + sec) * 1000 + ms;
        const text = match[4].trim();

        if (text) {
          parsedLyrics.push({
            id: `song-${idx + 1}`,
            startMs,
            endMs: startMs + 3000,
            original: text,
            pronunciation: text,
            meaning: text
          });
        }
      } else {
        parsedLyrics.push({
          id: `song-${idx + 1}`,
          startMs: currentTimeMs,
          endMs: currentTimeMs + 3000,
          original: line,
          pronunciation: line,
          meaning: line
        });
        currentTimeMs += 3200;
      }
    });

    // LRC 태그가 있었을 경우 이전 라인의 endMs를 다음 라인의 startMs로 정렬
    if (hasLrcTags) {
      for (let i = 0; i < parsedLyrics.length - 1; i++) {
        parsedLyrics[i].endMs = Math.max(parsedLyrics[i].startMs + 500, parsedLyrics[i + 1].startMs);
      }
    }

    if (parsedLyrics.length > 0) {
      setLyrics(parsedLyrics);
      setPasteModalOpen(false);
      setPastedLyricsText('');
      toast({
        title: '📋 가사 텍스트 일괄 파싱 완료',
        description: `총 ${parsedLyrics.length}개 가사 라인이 등록되었습니다. 이제 [AI 3-Track 가사 싱크 자동 분석]을 누르면 한글 발음과 번역이 자동으로 완성됩니다.`
      });
    }
  };

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
    e.target.value = '';
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

  // 커스텀 앨범 커버 자켓 업로드 핸들러
  const handleAlbumCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAlbumCoverFile(file);
      const url = URL.createObjectURL(file);
      setAlbumCoverPreview(url);
      toast({
        title: '🎨 앨범 자켓 이미지 등록',
        description: `'${file.name}' 이미지가 LP판 및 자켓 테마에 지정되었습니다.`
      });
    }
    e.target.value = '';
  };

  // 원클릭 가사 싱크 일괄 이동 핸들러
  const handleShiftLyricsSync = (deltaMs: number) => {
    if (lyrics.length === 0) return;
    setLyrics(prev => prev.map(l => ({
      ...l,
      startMs: Math.max(0, l.startMs + deltaMs),
      endMs: Math.max(200, l.endMs + deltaMs)
    })));
    toast({
      title: '⏱️ 가사 싱크 일괄 보정',
      description: `전체 ${lyrics.length}개 가사 라인이 ${deltaMs > 0 ? `+${deltaMs / 1000}초` : `${deltaMs / 1000}초`} 이동되었습니다.`
    });
  };

  // 쇼츠 하이라이트 구간 프리셋 적용
  const handleApplyTrimPreset = (durationSecs: number) => {
    if (durationSecs === 0) {
      setIsTrimmingEnabled(false);
      setTrimStartSecs(0);
      setTrimEndSecs(60);
      toast({ title: '구간 설정 해제', description: '음원 전체 구간을 사용합니다.' });
    } else {
      setIsTrimmingEnabled(true);
      setTrimStartSecs(0);
      setTrimEndSecs(durationSecs);
      toast({ title: `${durationSecs}초 쇼츠 구간 지정`, description: `0.0초 ~ ${durationSecs}.0초 구간이 설정되었습니다.` });
    }
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
      const response = await api.post('/song/transcribe-3track', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });

      const resData = response.data?.data;
      if (resData && Array.isArray(resData.lines) && resData.lines.length > 0) {
        setLyrics(resData.lines);
        if (resData.audio_path) {
          setExtractedAudioPath(resData.audio_path);
        }
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

    // 쇼츠 하이라이트 구간 트리밍 반영
    let finalLyrics = lyrics;
    let finalDuration = Math.max(10, Math.ceil(lyrics[lyrics.length - 1].endMs / 1000));
    
    if (isTrimmingEnabled && trimEndSecs > trimStartSecs) {
      finalDuration = trimEndSecs - trimStartSecs;
      const startMs = trimStartSecs * 1000;
      const endMs = trimEndSecs * 1000;
      finalLyrics = lyrics
        .filter(l => l.endMs > startMs && l.startMs < endMs)
        .map(l => ({
          ...l,
          startMs: Math.max(0, l.startMs - startMs),
          endMs: Math.max(200, l.endMs - startMs)
        }));
      if (finalLyrics.length === 0) finalLyrics = lyrics;
    }

    try {
      // 1. Remotion MP4 실물 렌더링 요청
      const renderForm = new FormData();
      renderForm.append('project_id', jobId);
      renderForm.append('song_title', songTitle);
      renderForm.append('artist_name', artistName);
      renderForm.append('visual_theme', visualTheme);
      renderForm.append('lyrics_json', JSON.stringify(finalLyrics));
      renderForm.append('enable_original', String(enableOriginal));
      renderForm.append('enable_pronunciation', String(enablePronunciation));
      renderForm.append('enable_meaning', String(enableMeaning));
      renderForm.append('sync_offset_ms', String(syncOffsetMs));
      renderForm.append('duration_seconds', String(finalDuration));

      // 오디오 바이너리 전달
      const audioToUse = extractedAudioPath || selectedVideoPath || '';
      if (audioToUse) {
        renderForm.append('audio_source', audioToUse);
      }
      if (selectedFile) {
        renderForm.append('audio_source_file', selectedFile);
      }
      if (selectedVideoPath) {
        renderForm.append('video_source', selectedVideoPath);
      }
      if (albumCoverFile) {
        renderForm.append('album_cover_file', albumCoverFile);
      }

      // 3-Track 스타일 전달
      const curPreset = COLOR_PRESETS[colorPreset];
      renderForm.append('original_color', curPreset.orig);
      renderForm.append('pronunciation_color', curPreset.pron);
      renderForm.append('meaning_color', curPreset.mean);
      renderForm.append('text_position', textPosition);

      toast({
        title: '🎬 Remotion 실물 렌더링 시작',
        description: `'${songTitle}' 1080x1920 MP4 비디오 렌더링이 시작되었습니다.`
      });

      const renderRes = await api.post('/song/render-song-shorts', renderForm, {
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
        subtitlesCount: finalLyrics.length,
        videoPath: videoPath,
        exportPath: videoPath,
        renderEngine: 'remotion',
        lyricsData: finalLyrics,
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

      const curPreset = COLOR_PRESETS[colorPreset];
      const yOffsetBase = textPosition === 'top' ? 25 : textPosition === 'middle' ? 50 : 65;

      const originalItems = lyricsToExport.map((l, i) => ({
        id: `song-orig-${i + 1}`,
        text: l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 34,
        textColor: curPreset.orig,
        yPct: yOffsetBase - 5
      }));

      const pronItems = lyricsToExport.map((l, i) => ({
        id: `song-pron-${i + 1}`,
        text: l.pronunciation || l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 26,
        textColor: curPreset.pron,
        yPct: yOffsetBase + 4
      }));

      const meanItems = lyricsToExport.map((l, i) => ({
        id: `song-mean-${i + 1}`,
        text: l.meaning || l.original,
        startMs: l.startMs,
        endMs: l.endMs,
        fontSize: 36,
        textColor: curPreset.mean,
        yPct: yOffsetBase + 13
      }));

      const audioPathToUse = extractedAudioPath || selectedVideoPath || (selectedFile as any)?.path || audioFileName || 'song_audio.mp3';

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
        audios: audioPathToUse ? [
          {
            id: 'song-audio-mat',
            name: audioFileName || 'song_audio.mp3',
            path: audioPathToUse,
            type: 'bgm',
            startMs: 0,
            durationMs: totalDur,
            volume: 1.0
          }
        ] : []
      });

      if (res.success) {
        toast({
          title: '🎬 CapCut 3-Track 초안 내보내기 완료',
          description: `원어·발음·한국어 3개 독립 트랙 및 오디오가 포함된 CapCut 프로젝트가 성공적으로 생성되었습니다.`
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
                  <option key={l.code} value={l.code}>{l.flag ? `${l.flag} ${l.name}` : l.name}</option>
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

          {/* 앨범 커버 자켓 이미지 지정 (LP판 중심 / 자켓 테마) */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                앨범 커버 자켓 이미지
              </label>
              {albumCoverPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setAlbumCoverFile(null);
                    setAlbumCoverPreview('');
                  }}
                  className="text-[10px] text-destructive hover:underline cursor-pointer"
                >
                  제거
                </button>
              )}
            </div>

            {albumCoverPreview ? (
              <div className="flex items-center gap-2.5 p-2 rounded-lg border border-border bg-muted/20">
                <img
                  src={albumCoverPreview}
                  alt="Album Cover"
                  className="w-10 h-10 rounded-md object-cover border border-border shrink-0 shadow-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-foreground truncate">{albumCoverFile?.name || '커버 이미지'}</div>
                  <div className="text-[10px] text-muted-foreground">LP판 중심 및 자켓 카드에 적용됨</div>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/10 hover:bg-muted/30 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition">
                <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>커스텀 앨범 자켓 이미지 선택 (JPG/PNG)</span>
                <input type="file" accept="image/*" onChange={handleAlbumCoverUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* 쇼츠 하이라이트 구간 트리밍 (Audio Trimmer) */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-primary" />
                쇼츠 구간 트리밍 (선택)
              </label>
              <input
                type="checkbox"
                checked={isTrimmingEnabled}
                onChange={e => setIsTrimmingEnabled(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>

            {isTrimmingEnabled && (
              <div className="space-y-2 p-2.5 rounded-lg bg-muted/20 border border-border text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">시작(초)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={trimStartSecs}
                      onChange={e => setTrimStartSecs(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-16 p-1 text-xs font-mono text-center rounded border border-border bg-background"
                    />
                  </div>
                  <span className="text-muted-foreground text-xs pt-3">~</span>
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">종료(초)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={trimEndSecs}
                      onChange={e => setTrimEndSecs(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="w-16 p-1 text-xs font-mono text-center rounded border border-border bg-background"
                    />
                  </div>
                  <div className="pt-3 text-right">
                    <Badge variant="secondary" className="font-mono text-[10px] text-primary font-bold">
                      {Math.max(0, trimEndSecs - trimStartSecs).toFixed(1)}초
                    </Badge>
                  </div>
                </div>

                {/* 쇼츠 규격 원클릭 프리셋 */}
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">프리셋:</span>
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {[
                      { label: '전체', dur: 0 },
                      { label: '15초', dur: 15 },
                      { label: '30초', dur: 30 },
                      { label: '60초', dur: 60 },
                    ].map(p => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleApplyTrimPreset(p.dur)}
                        className="h-6 px-1 text-[10px] font-bold border-border hover:bg-muted"
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ZONE 2 & 3 (중앙 및 우측 8칸): 3-Track 가사 편집기 & 실시간 프리뷰 ── */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* 가사 테이블 헤더 및 액션 버튼 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">3중 트랙 가사 타임코드 싱크 매트릭스 ({lyrics.length}줄)</span>

                {/* 원클릭 가사 싱크 일괄 오프셋 이동 도구 */}
                {lyrics.length > 0 && (
                  <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border border-border text-[10px] ml-1">
                    <span className="text-muted-foreground px-1 font-bold">싱크 일괄:</span>
                    <button
                      type="button"
                      onClick={() => handleShiftLyricsSync(-500)}
                      className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-primary font-bold transition cursor-pointer"
                      title="전체 가사 0.5초 당기기"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftLyricsSync(-200)}
                      className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-primary font-bold transition cursor-pointer"
                      title="전체 가사 0.2초 당기기"
                    >
                      -0.2s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftLyricsSync(200)}
                      className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-primary font-bold transition cursor-pointer"
                      title="전체 가사 0.2초 미루기"
                    >
                      +0.2s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftLyricsSync(500)}
                      className="px-1.5 py-0.5 rounded hover:bg-muted font-mono text-primary font-bold transition cursor-pointer"
                      title="전체 가사 0.5초 미루기"
                    >
                      +0.5s
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasteModalOpen(true)}
                  className="h-8 text-xs font-bold gap-1 text-foreground border-border hover:bg-muted/60 cursor-pointer"
                  title="외부 가사 텍스트 또는 LRC 포맷 일괄 붙여넣기"
                >
                  <AlignLeft className="w-3.5 h-3.5 text-primary" />
                  <span>가사 붙여넣기</span>
                </Button>

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
                      <div className="col-span-2 font-mono text-[11px] text-primary font-bold flex items-center gap-0.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={(line.startMs / 1000).toFixed(1)}
                          onChange={e => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, startMs: Math.round(val * 1000) } : l));
                          }}
                          className="w-12 p-0.5 text-[10.5px] font-mono text-primary font-bold rounded border border-border bg-background text-center focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-muted-foreground text-[10px]">~</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={(line.endMs / 1000).toFixed(1)}
                          onChange={e => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, endMs: Math.round(val * 1000) } : l));
                          }}
                          className="w-12 p-0.5 text-[10.5px] font-mono text-primary font-bold rounded border border-border bg-background text-center focus:ring-1 focus:ring-primary"
                        />
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
              <div className="flex items-center justify-between w-full flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                    9:16 캔버스 실시간 비주얼 프리뷰
                  </Badge>
                </div>

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

              {/* 3-Track 자막 시각 스타일 인스펙터 바 */}
              <div className="w-full flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border text-xs flex-wrap">
                {/* 컬러 테마 선택 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">스타일 테마:</span>
                  <div className="flex items-center gap-1">
                    {(Object.keys(COLOR_PRESETS) as Array<keyof typeof COLOR_PRESETS>).map(key => {
                      const p = COLOR_PRESETS[key];
                      const isSel = colorPreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setColorPreset(key)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1 border",
                            isSel
                              ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                              : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: p.pron }}
                          />
                          <span>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 자막 수직 위치 선택 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">위치:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'top', label: '상단' },
                      { id: 'middle', label: '중앙' },
                      { id: 'bottom', label: '하단' },
                    ].map(pos => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setTextPosition(pos.id as any)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer border",
                          textPosition === pos.id
                            ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                            : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 캔버스 화면 시뮬레이션 */}
              <div className="w-full max-w-sm min-h-[260px] py-4 px-3 rounded-lg bg-black/90 border border-border/80 shadow-inner flex flex-col justify-between relative overflow-hidden">
                {/* 상단 곡 정보 */}
                <div className="text-[10px] text-primary/90 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 z-10">
                  <span>🎵 {songTitle} - {artistName}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/20 text-white/70">
                    {visualTheme.toUpperCase()}
                  </Badge>
                </div>

                {/* 중앙 비주얼 테마 시뮬레이션 (LP 회전 / 앨범 커버) */}
                <div className="flex items-center justify-center my-auto py-2 z-10">
                  {visualTheme === 'vinyl' && (
                    <div className="relative w-24 h-24 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center shadow-lg animate-spin-slow">
                      <div className="w-20 h-20 rounded-full border border-dashed border-neutral-600/50 flex items-center justify-center">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-cover bg-center border border-neutral-500 shadow-inner"
                          style={{
                            backgroundImage: albumCoverPreview ? `url(${albumCoverPreview})` : undefined,
                            backgroundColor: albumCoverPreview ? undefined : '#F59E0B'
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-black/90" />
                        </div>
                      </div>
                    </div>
                  )}

                  {visualTheme === 'jacket' && (
                    <div className="w-24 h-24 rounded-xl border border-white/20 overflow-hidden shadow-2xl relative flex items-center justify-center bg-muted/40">
                      {albumCoverPreview ? (
                        <img src={albumCoverPreview} alt="Jacket" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2">
                          <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                          <span className="text-[9px] text-white/70 font-bold block truncate">{artistName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {visualTheme === 'visualizer' && (
                    <div className="flex items-end justify-center gap-1 h-14 px-4">
                      {[35, 55, 80, 45, 90, 60, 75, 40, 65, 85, 50, 70].map((h, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-primary/80 rounded-full animate-pulse"
                          style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
                        />
                      ))}
                    </div>
                  )}

                  {visualTheme === 'poster' && (
                    <div className="text-center py-2">
                      <div className="text-sm font-black text-white tracking-widest uppercase">{songTitle}</div>
                      <div className="text-[10px] text-sky-400 font-bold tracking-wider uppercase">{artistName}</div>
                    </div>
                  )}
                </div>

                {/* 3-Track 가사 렌더 박스 (위치에 따라 flex 정렬) */}
                <div
                  className={cn(
                    "w-full space-y-1 py-2 px-2.5 rounded-lg bg-black/60 backdrop-blur-xs border border-white/10 shadow-lg z-10 transition-all",
                    textPosition === 'top' ? "order-first mb-2" : textPosition === 'middle' ? "my-auto" : "mt-2"
                  )}
                >
                  {enableOriginal && (
                    <div
                      className="text-xs sm:text-sm font-black tracking-wide drop-shadow-md"
                      style={{ color: COLOR_PRESETS[colorPreset].orig }}
                    >
                      {activeLyric?.original || '가사를 입력하거나 AI 분석을 실행하세요'}
                    </div>
                  )}
                  {enablePronunciation && activeLyric?.pronunciation && (
                    <div
                      className="text-[11px] font-bold font-mono tracking-tight"
                      style={{ color: COLOR_PRESETS[colorPreset].pron }}
                    >
                      {activeLyric.pronunciation}
                    </div>
                  )}
                  {enableMeaning && activeLyric?.meaning && (
                    <div
                      className="text-[11px] font-semibold"
                      style={{ color: COLOR_PRESETS[colorPreset].mean }}
                    >
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
          selectedItemIds={selectedQueueIds}
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

      {/* 4. 가사 일괄 붙여넣기(LRC/텍스트) 모달 */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-5 max-w-xl w-full space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">가사 텍스트 / LRC 일괄 붙여넣기</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                LRC & 텍스트 자동 인식
              </Badge>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                웹이나 음원 사이트에서 복사한 가사를 붙여넣으세요. 시간 태그(<code>[00:15.30]</code>)가 포함된 LRC 형식은 타임코드가 자동 추출되며, 일반 텍스트는 3초 간격으로 자동 분할됩니다.
              </p>
              <textarea
                value={pastedLyricsText}
                onChange={e => setPastedLyricsText(e.target.value)}
                placeholder={"[00:00.00] It was just two lovers\n[00:03.50] Sittin' in the car, listenin' to Blonde\n... 또는 일반 줄바꿈 가사"}
                className="w-full h-56 p-3 text-xs font-mono rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPasteModalOpen(false);
                  setPastedLyricsText('');
                }}
                className="text-xs cursor-pointer"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleApplyPastedLyrics}
                className="text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>테이블에 파싱 적용</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongBatchTab;
