import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Scissors,
  Zap,
  FolderOpen,
  Volume2,
  Sparkles,
  Download,
  Flame,
  Film,
  Play,
  Loader2,
  Columns2,
  ListTodo,
  Layers,
  Wand2,
  CheckCircle2,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';

import {
  ClipData,
  EpisodeData,
  PresetItem,
  BatchQueueItem,
  DEFAULT_PRESETS
} from './types';
import { EpisodeDeckBar } from './EpisodeDeckBar';
import { LiveVideoMonitor } from './LiveVideoMonitor';
import { VisualTimelineNLE } from './VisualTimelineNLE';
import { ClipPolishCardList } from './ClipPolishCardList';
import { PresetGeneratorModal } from './PresetGeneratorModal';
import { PronunciationOptimizerModal } from './PronunciationOptimizerModal';
import { GalleryPickerModal } from './GalleryPickerModal';
import { BatchQueueMatrix } from './BatchQueueMatrix';
import TTSSettingsDialog from '@/components/TTSSettingsDialog';
import { GLOBAL_LANGUAGES } from '@/types/ddalkkak';

const STORAGE_KEY_STUDIO_STATE = 'vlstudio_scenestudio_state';
const STORAGE_KEY_CUSTOM_PRESETS = 'vlstudio_scenestudio_presets';
const STORAGE_KEY_QUEUE = 'vlstudio_scenestudio_queue';

export const UniversalSceneStudio: React.FC = () => {
  // 1. 영상 소스 상태
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPath, setVideoPath] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('무제 영화·드라마 프로젝트');

  // 2. 프리셋 & 설정 상태
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
      return saved ? [...DEFAULT_PRESETS, ...JSON.parse(saved)] : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gutavari');
  const [targetLang, setTargetLang] = useState<string>('ko');
  const [durationMode, setDurationMode] = useState<'shorts' | 'longform'>('shorts');
  const [episodeCount, setEpisodeCount] = useState<number>(10);
  const [targetMinutes, setTargetMinutes] = useState<number>(20);
  const [enableDiarization, setEnableDiarization] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // 3. 에피소드 & 클립 상태
  const [episodes, setEpisodes] = useState<EpisodeData[]>([
    {
      id: 1,
      title: '쇼츠 1편: 시작 후 3초의 충격',
      top_hook: '단 3초 만에 10억 날린 사연',
      total_duration_sec: 54.0,
      clips: [
        {
          clip_id: 1,
          source_start: 10.0,
          source_end: 15.5,
          duration: 5.5,
          narration: '평화롭던 마을에 갑자기 나타난 의문의 서류 가방 하나.',
          speaker_a_dialogue: '이거 도대체 어디서 난 거야?',
          speaker_b_dialogue: '',
          jab_sticker: '(동공지진)',
          sfx_recommend: 'boom',
        },
        {
          clip_id: 2,
          source_start: 15.5,
          source_end: 22.0,
          duration: 6.5,
          narration: '가방을 열자마자 드러난 충격적인 거액의 현금 뭉치.',
          speaker_a_dialogue: '',
          speaker_b_dialogue: '절대 손대면 안 돼!',
          jab_sticker: '(극대노)',
          sfx_recommend: 'ding',
        },
      ],
    },
  ]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<number>(1);
  const [activeClipId, setActiveClipId] = useState<number>(1);

  // 4. 모니터 & 타임라인 상태
  const [currentTime, setCurrentTime] = useState<number>(10.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // 5. 모달 오픈 상태
  const [isPresetModalOpen, setIsPresetModalOpen] = useState<boolean>(false);
  const [isPronounceModalOpen, setIsPronounceModalOpen] = useState<boolean>(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState<boolean>(false);
  const [isTTSModalOpen, setIsTTSModalOpen] = useState<boolean>(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);

  // 6. 대기열(Queue) 상태
  const [queueItems, setQueueItems] = useState<BatchQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUEUE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [searchParams] = useSearchParams();

  // 🎯 보관함이나 외부 링크에서 전달된 titles 자동 수신
  const lastProcessedParams = useRef<string>('');
  useEffect(() => {
    const titlesParam = searchParams.get('titles');
    if (titlesParam && lastProcessedParams.current !== titlesParam) {
      lastProcessedParams.current = titlesParam;
      const titles = decodeURIComponent(titlesParam).split(',').filter(Boolean);
      if (titles.length > 0) {
        if (titles.length === 1) {
          setVideoTitle(titles[0]);
          setVideoPath(titles[0]);
          toast.success(`영상 로드: "${titles[0]}"`);
        } else {
          const incomingItems: BatchQueueItem[] = titles.map((t, idx) => ({
            id: `incoming_${Date.now()}_${idx}`,
            video_title: t,
            video_path: t,
            status: 'pending',
            progress: 0,
            preset_id: selectedPresetId,
            target_lang: targetLang,
            target_duration_type: durationMode,
            episode_count: episodeCount,
            target_minutes: targetMinutes,
            enable_speaker_diarization: enableDiarization,
            created_at: new Date().toISOString(),
          }));
          setQueueItems((prev) => [...prev, ...incomingItems]);
          setIsQueueDrawerOpen(true);
          toast.success(`${incomingItems.length}개 영상이 대기열에 자동 등록되었습니다.`);
        }
      }
    }
  }, [searchParams]);

  // 현재 활성 에피소드 및 클립
  const activeEpisode = episodes.find((e) => e.id === activeEpisodeId) || episodes[0];
  const activeClip = activeEpisode?.clips.find((c) => c.clip_id === activeClipId) || activeEpisode?.clips[0];

  // 💾 상태 로컬 저장 (자가치유 복구)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queueItems));
    } catch (_) {}
  }, [queueItems]);

  // ⌨️ 단축키 시스템 (Space, Arrow keys, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 텍스트 입력창에서는 단축키 방지
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 1.0));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((prev) => prev + 1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 📁 파일 드롭/업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      setVideoPath(file.name);
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      const objUrl = URL.createObjectURL(file);
      setVideoUrl(objUrl);
      toast.success(`영상 로드 완료: ${file.name}`);
    }
  };

  // 🚀 AI 씬 분할 & 각색 분석 시작
  const handleStartAnalysis = async () => {
    if (!videoUrl && !videoPath) {
      toast.error('먼저 분석할 영상을 불러와 주세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await api.post('/universal-cutter/split-episodes', {
        video_title: videoTitle,
        video_path: videoPath,
        preset_id: selectedPresetId,
        target_lang: targetLang,
        episode_count: episodeCount,
        target_duration_type: durationMode,
        target_minutes: targetMinutes,
        enable_speaker_diarization: enableDiarization,
        custom_prompt: customPrompt || undefined,
      });

      if (res.data?.success && res.data?.data?.episodes) {
        setEpisodes(res.data.data.episodes);
        setActiveEpisodeId(res.data.data.episodes[0]?.id || 1);
        setActiveClipId(res.data.data.episodes[0]?.clips[0]?.clip_id || 1);
        toast.success(`AI 분석 완료! ${res.data.data.episodes.length}개 에피소드가 생성되었습니다.`);
      } else {
        toast.error('씬 분석 결과가 올바르지 않습니다.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || 'AI 씬 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 🎬 CapCut 프로젝트 내보내기
  const handleExportCapcut = async () => {
    try {
      toast.info('CapCut 11단 멀티 트랙 프로젝트를 빌드 중입니다...');
      const res = await api.post('/universal-cutter/export-capcut', {
        project_title: videoTitle,
        video_path: videoPath,
        episodes: episodes,
        target_lang: targetLang,
      });

      if (res.data?.success) {
        toast.success(`🎉 CapCut 프로젝트가 성공적으로 내보내졌습니다! (${res.data.project_path})`);
      }
    } catch (err: any) {
      toast.error('CapCut 내보내기 실패: ' + (err.response?.data?.detail || err.message));
    }
  };

  // 클립 정보 업데이트
  const handleUpdateClip = (clipId: number, updated: Partial<ClipData>) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== activeEpisodeId) return ep;
        return {
          ...ep,
          clips: ep.clips.map((c) => (c.clip_id === clipId ? { ...c, ...updated } : c)),
        };
      })
    );
  };

  // 클립 삭제
  const handleDeleteClip = (clipId: number) => {
    setEpisodes((prev) =>
      prev.map((ep) => {
        if (ep.id !== activeEpisodeId) return ep;
        return {
          ...ep,
          clips: ep.clips.filter((c) => c.clip_id !== clipId),
        };
      })
    );
  };

  // 수집 영상 보관함에서 대기열로 담기 핸들러
  const handleAddVideosFromGallery = (selectedVideos: any[]) => {
    const newItems: BatchQueueItem[] = selectedVideos.map((v) => ({
      id: `queue_${Date.now()}_${v.id}`,
      video_id: v.id,
      video_title: v.title,
      video_path: v.file_path,
      video_url: v.file_path,
      status: 'pending',
      progress: 0,
      preset_id: selectedPresetId,
      target_lang: targetLang,
      target_duration_type: durationMode,
      episode_count: episodeCount,
      target_minutes: targetMinutes,
      enable_speaker_diarization: enableDiarization,
      created_at: new Date().toISOString(),
    }));

    setQueueItems((prev) => [...prev, ...newItems]);
    toast.success(`${selectedVideos.length}개 영상이 대기열에 추가되었습니다!`);
    setIsQueueDrawerOpen(true);
  };

  // 대기열 아이템을 마스터 스튜디오로 로드
  const handleLoadQueueItemIntoStudio = (item: BatchQueueItem) => {
    setVideoTitle(item.video_title);
    setVideoPath(item.video_path);
    if (item.video_url) setVideoUrl(item.video_url);
    if (item.episodes && item.episodes.length > 0) {
      setEpisodes(item.episodes);
      setActiveEpisodeId(item.episodes[0].id);
      setActiveClipId(item.episodes[0].clips[0]?.clip_id || 1);
    }
    setSelectedPresetId(item.preset_id);
    setTargetLang(item.target_lang);
    setDurationMode(item.target_duration_type);
    setIsQueueDrawerOpen(false);
    toast.success(`'${item.video_title}'을(를) 마스터 스튜디오로 로드했습니다.`);
  };

  // 대기열 순차 일괄 자동화 실행
  const handleStartBatchProcessing = async () => {
    setIsBatchProcessing(true);
    toast.info('대기열 순차 일괄 자동화가 시작되었습니다.');

    for (let i = 0; i < queueItems.length; i++) {
      const item = queueItems[i];
      if (item.status === 'done') continue;

      // 1. 상태 업데이트: analyzing
      setQueueItems((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'analyzing', progress: 30 } : q))
      );

      try {
        const res = await api.post('/universal-cutter/split-episodes', {
          video_title: item.video_title,
          video_path: item.video_path,
          video_id: item.video_id,
          preset_id: item.preset_id,
          target_lang: item.target_lang,
          episode_count: item.episode_count,
          target_duration_type: item.target_duration_type,
          target_minutes: item.target_minutes,
          enable_speaker_diarization: item.enable_speaker_diarization,
        });

        const analyzedEpisodes = res.data?.data?.episodes || [];

        // 2. 상태 업데이트: packaging -> done
        setQueueItems((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'done', progress: 100, episodes: analyzedEpisodes }
              : q
          )
        );
      } catch (err: any) {
        setQueueItems((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', error_message: err.message } : q
          )
        );
      }
    }

    setIsBatchProcessing(false);
    toast.success('대기열 일괄 처리가 완료되었습니다!');
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col bg-background text-foreground overflow-hidden select-none">
      {/* 1. 상단 글로벌 헤더 바 */}
      <div className="h-11 px-4 bg-card border-b border-border flex items-center justify-between gap-3 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-black">
            <Scissors className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-black text-foreground truncate">
            {videoTitle}
          </span>
          <Badge variant="outline" className="text-[10px] h-5 hidden sm:inline-flex border-border">
            {durationMode === 'shorts' ? `쇼츠 ${episodeCount}편 모드` : `롱폼 ${targetMinutes}분 모드`}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* 대기열 실시간 현황 드로어 토글 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsQueueDrawerOpen(!isQueueDrawerOpen)}
            className={`h-7 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all ${
              queueItems.length > 0
                ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : 'text-muted-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>대기열 ({queueItems.filter((q) => q.status === 'done').length}/{queueItems.length})</span>
          </Button>

          {/* 수집 보관함에서 담기 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGalleryModalOpen(true)}
            className="h-7 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">보관함에서 불러오기</span>
          </Button>

          {/* TTS 발음 최적화 검토 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPronounceModalOpen(true)}
            className="h-7 text-xs font-bold rounded-xl flex items-center gap-1.5 border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden md:inline">TTS 발음 최적화</span>
          </Button>

          {/* TTS 음성 설정 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTTSModalOpen(true)}
            className="h-7 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-primary" />
            <span className="hidden md:inline">음성 설정</span>
          </Button>

          {/* CapCut 내보내기 */}
          <Button
            size="sm"
            onClick={handleExportCapcut}
            className="h-7 text-xs font-extrabold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CapCut 내보내기</span>
          </Button>
        </div>
      </div>

      {/* 2. 에피소드 덱 바 (#1 ~ #10) */}
      {durationMode === 'shorts' && (
        <EpisodeDeckBar
          episodes={episodes}
          activeEpisodeId={activeEpisodeId}
          onSelectEpisode={(id) => {
            setActiveEpisodeId(id);
            const ep = episodes.find((e) => e.id === id);
            if (ep && ep.clips.length > 0) {
              setActiveClipId(ep.clips[0].clip_id);
              setCurrentTime(ep.clips[0].source_start);
            }
          }}
          onAddEpisode={() => {
            const nextId = (Math.max(...episodes.map((e) => e.id), 0)) + 1;
            const newEp: EpisodeData = {
              id: nextId,
              title: `쇼츠 ${nextId}편`,
              top_hook: `쇼츠 ${nextId}편의 충격 결말`,
              total_duration_sec: 50.0,
              clips: [],
            };
            setEpisodes([...episodes, newEp]);
            setActiveEpisodeId(nextId);
          }}
          onDeleteEpisode={(id) => {
            const filtered = episodes.filter((e) => e.id !== id);
            setEpisodes(filtered);
            if (activeEpisodeId === id && filtered.length > 0) {
              setActiveEpisodeId(filtered[0].id);
            }
          }}
        />
      )}

      {/* 3. 메인 3열 작업 공간 (좌측 컨트롤러 / 중앙 모니터+타임라인 / 우측 카드) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* ① 좌측: 인제스트 & 각색 프리셋 패널 (280~310px) */}
        <div className="w-72 lg:w-80 bg-card border-r border-border p-3.5 flex flex-col gap-3 overflow-y-auto shrink-0 select-none">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              1. 영상 인제스트
            </span>
            <div className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-3 bg-muted/20 text-center cursor-pointer transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Film className="w-5 h-5 mx-auto text-muted-foreground/60 mb-1" />
              <p className="text-xs font-bold text-foreground truncate">
                {videoPath ? videoPath : '영상 파일 선택 / 드래그'}
              </p>
              <p className="text-[10px] text-muted-foreground">MP4, MKV 지원</p>
            </div>
          </div>

          {/* 출력 모드 및 수량 */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              2. 출력 모드 & 수량
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setDurationMode('shorts')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  durationMode === 'shorts'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 border-border text-muted-foreground'
                }`}
              >
                쇼츠 N개 모드
              </button>
              <button
                onClick={() => setDurationMode('longform')}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  durationMode === 'longform'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 border-border text-muted-foreground'
                }`}
              >
                롱폼 단일 모드
              </button>
            </div>

            {durationMode === 'shorts' ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label className="text-xs text-foreground font-semibold">쇼츠 수량:</Label>
                <Select
                  value={String(episodeCount)}
                  onValueChange={(val) => setEpisodeCount(Number(val))}
                >
                  <SelectTrigger className="h-8 w-28 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3개 (미니)</SelectItem>
                    <SelectItem value="5">5개 (표준)</SelectItem>
                    <SelectItem value="8">8개 (풀세트)</SelectItem>
                    <SelectItem value="10">10개 (대량)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Label className="text-xs text-foreground font-semibold">목표 분수:</Label>
                <Select
                  value={String(targetMinutes)}
                  onValueChange={(val) => setTargetMinutes(Number(val))}
                >
                  <SelectTrigger className="h-8 w-28 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10분 하이라이트</SelectItem>
                    <SelectItem value="20">20분 스토리보드</SelectItem>
                    <SelectItem value="30">30분 풀 다큐</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* 고수익 타겟 언어 */}
          <div className="space-y-1 pt-1 border-t border-border/60">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              3. 타겟 국가 / 언어 말맛
            </span>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLOBAL_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.flag} {l.name} {l.cpmDescription ? `(${l.cpmDescription})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 각색 프리셋 선택 */}
          <div className="space-y-1 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                4. 각색 프리셋
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPresetModalOpen(true)}
                className="h-5 px-1 text-[10px] text-primary hover:bg-primary/10 font-bold flex items-center gap-0.5"
              >
                <Sparkles className="w-3 h-3" />
                + AI 프리셋 생성
              </Button>
            </div>

            <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 화자 분리 토글 */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-foreground">화자 분리 더빙</Label>
              <p className="text-[10px] text-muted-foreground">남주/여주 대사 독립 자막·더빙</p>
            </div>
            <Switch
              checked={enableDiarization}
              onCheckedChange={setEnableDiarization}
            />
          </div>

          {/* 🚀 AI 씬 분석 시작 버튼 */}
          <div className="pt-3 mt-auto">
            <Button
              size="lg"
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold text-xs shadow-md flex items-center justify-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>표준 분석 모델로 씬 분석 중...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>🚀 AI 씬 분석 & 쇼츠 마스터링</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ② 중앙: 라이브 모니터 (상단) + 멀티 트랙 타임라인 (하단) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* 중앙 상단: 9:16 / 16:9 라이브 모니터 */}
          <div className="flex-[6] min-h-0 p-2.5">
            <LiveVideoMonitor
              videoUrl={videoUrl}
              activeClip={activeClip}
              topHookTitle={activeEpisode?.top_hook}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={setCurrentTime}
              targetLang={targetLang}
            />
          </div>

          {/* 중앙 하단: CapCut 규격 11단 멀티 트랙 타임라인 */}
          <div className="flex-[4] min-h-[160px] border-t border-border">
            <VisualTimelineNLE
              clips={activeEpisode?.clips || []}
              activeClipId={activeClipId}
              onSelectClip={(id) => {
                setActiveClipId(id);
                const c = activeEpisode?.clips.find((clip) => clip.clip_id === id);
                if (c) setCurrentTime(c.source_start);
              }}
              currentTime={currentTime}
              totalDuration={activeEpisode?.total_duration_sec || 60}
              onSeek={setCurrentTime}
              onUpdateClipTime={(clipId, start, end) => {
                handleUpdateClip(clipId, {
                  source_start: start,
                  source_end: end,
                  duration: end - start,
                });
              }}
              topHookTitle={activeEpisode?.top_hook}
            />
          </div>
        </div>

        {/* ③ 우측: 인터랙티브 클립 퇴고 카드 덱 (320~380px) */}
        <div className="w-80 lg:w-96 shrink-0 h-full overflow-hidden">
          <ClipPolishCardList
            clips={activeEpisode?.clips || []}
            activeClipId={activeClipId}
            onSelectClip={(id) => {
              setActiveClipId(id);
              const c = activeEpisode?.clips.find((clip) => clip.clip_id === id);
              if (c) setCurrentTime(c.source_start);
            }}
            onUpdateClip={handleUpdateClip}
            onDeleteClip={handleDeleteClip}
            onAddClipAfter={() => {}}
            onPreviewTTS={(text) => {
              toast.info(`TTS 미리듣기: "${text}"`);
            }}
            targetLang={targetLang}
          />
        </div>

        {/* ④ 우측 슬라이드 대기열 라이브 미니 드로어 (Drawer) */}
        {isQueueDrawerOpen && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-[500px] z-50 bg-background/98 backdrop-blur-md border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
            <BatchQueueMatrix
              queueItems={queueItems}
              onAddVideos={(files) => {
                const newItems: BatchQueueItem[] = Array.from(files).map((f) => ({
                  id: `queue_${Date.now()}_${Math.random()}`,
                  video_title: f.name.replace(/\.[^/.]+$/, ''),
                  video_path: f.name,
                  video_url: URL.createObjectURL(f),
                  size: f.size,
                  status: 'pending',
                  progress: 0,
                  preset_id: selectedPresetId,
                  target_lang: targetLang,
                  target_duration_type: durationMode,
                  episode_count: episodeCount,
                  target_minutes: targetMinutes,
                  enable_speaker_diarization: enableDiarization,
                  created_at: new Date().toISOString(),
                }));
                setQueueItems((prev) => [...prev, ...newItems]);
                toast.success(`${files.length}개 영상이 대기열에 추가되었습니다.`);
              }}
              onOpenGalleryPicker={() => setIsGalleryModalOpen(true)}
              onRemoveQueueItem={(id) => setQueueItems((prev) => prev.filter((q) => q.id !== id))}
              onClearQueue={() => setQueueItems([])}
              onStartBatchProcessing={handleStartBatchProcessing}
              isProcessing={isBatchProcessing}
              onLoadIntoStudio={handleLoadQueueItemIntoStudio}
              isDrawerMode={true}
              onCloseDrawer={() => setIsQueueDrawerOpen(false)}
            />
          </div>
        )}
      </div>

      {/* 4. 모달들 */}
      <PresetGeneratorModal
        open={isPresetModalOpen}
        onOpenChange={setIsPresetModalOpen}
        onPresetCreated={(newPreset) => {
          setPresets((prev) => [...prev, newPreset]);
          setSelectedPresetId(newPreset.id);
        }}
      />

      <PronunciationOptimizerModal
        open={isPronounceModalOpen}
        onOpenChange={setIsPronounceModalOpen}
        rawScript={activeEpisode?.clips.map((c) => c.narration).join('\n') || ''}
        targetLang={targetLang}
        onApplyOptimized={(optScript) => {
          const lines = optScript.split('\n').filter(Boolean);
          setEpisodes((prev) =>
            prev.map((ep) => {
              if (ep.id !== activeEpisodeId) return ep;
              return {
                ...ep,
                clips: ep.clips.map((c, i) => ({
                  ...c,
                  narration: lines[i] || c.narration,
                })),
              };
            })
          );
        }}
      />

      <GalleryPickerModal
        open={isGalleryModalOpen}
        onOpenChange={setIsGalleryModalOpen}
        onSelectVideos={handleAddVideosFromGallery}
      />

      <TTSSettingsDialog
        open={isTTSModalOpen}
        onOpenChange={setIsTTSModalOpen}
        onSave={(cfg) => {
          toast.success('TTS 음성 설정이 저장되었습니다.');
        }}
      />
    </div>
  );
};
