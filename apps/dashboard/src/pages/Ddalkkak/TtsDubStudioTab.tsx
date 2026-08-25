import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Mic,
  Settings,
  Globe2,
  RefreshCw,
  Eye,
  Film,
  Trash2,
  ChevronDown,
  FileVideo,
  ListTodo,
  Layers,
  Filter,
  X,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  GLOBAL_LANGUAGES,
  DDALKKAK_TTS_PRESETS,
  TTSPreset,
  GlobalLanguage
} from '@/types/ddalkkak';
import { ddalkkakApi, TtsDubJob } from '@/services/ddalkkakApi';
import TTSSettingsDialog from '@/components/TTSSettingsDialog';
import { BatchVideoItem } from './SubtitleStudioTab';

interface TtsDubStudioTabProps {
  jobs: TtsDubJob[];
  selectedJobIds: number[];
  onToggleSelectJob: (id: number) => void;
  onToggleSelectAll: () => void;
  onRefreshJobs: () => void;
  onOpenResult: (job: TtsDubJob) => void;
  onExportCapcut: (job: TtsDubJob) => void;
  onDeleteJob: (id: number) => void;
}

const STORAGE_KEY_TTS_ITEMS = 'vlstudio_ddalkkak_tts_items';
const STORAGE_KEY_TTS_LANGS = 'vlstudio_ddalkkak_tts_langs';
const STORAGE_KEY_TTS_PRESET = 'vlstudio_ddalkkak_tts_preset';

export const TtsDubStudioTab: React.FC<TtsDubStudioTabProps> = ({
  jobs,
  selectedJobIds,
  onToggleSelectJob,
  onToggleSelectAll,
  onRefreshJobs,
  onOpenResult,
  onExportCapcut,
  onDeleteJob,
}) => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub tab on the right panel ('queue' | 'history')
  const [rightTab, setRightTab] = useState<'queue' | 'history'>('queue');

  // Preset & TTS Settings state (with localStorage persistence)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TTS_PRESET) || 'preset_piljae';
    } catch {
      return 'preset_piljae';
    }
  });
  const [isTTSDialogOpen, setIsTTSDialogOpen] = useState<boolean>(false);
  const [currentTTSConfig, setCurrentTTSConfig] = useState<any>(DDALKKAK_TTS_PRESETS[0].config);

  // Target languages state (with localStorage persistence, default: ['ko'])
  const [targetLangs, setTargetLangs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TTS_LANGS);
      return saved ? JSON.parse(saved) : ['ko'];
    } catch {
      return ['ko'];
    }
  });
  const [showAllLangs, setShowAllLangs] = useState<boolean>(false);
  const [queueFilterLang, setQueueFilterLang] = useState<string>('all');

  // Unified Video Items state (with localStorage persistence)
  const [videoItems, setVideoItems] = useState<BatchVideoItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TTS_ITEMS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);

  // 💾 Save state changes to localStorage
  useEffect(() => {
    try {
      const serializable = videoItems.map(item => ({
        id: item.id,
        name: item.name,
        url: item.url,
        size: item.size || 0
      }));
      localStorage.setItem(STORAGE_KEY_TTS_ITEMS, JSON.stringify(serializable));
    } catch (e) {
      console.error('Failed to persist TTS video items:', e);
    }
  }, [videoItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TTS_LANGS, JSON.stringify(targetLangs));
    } catch (_) {}
  }, [targetLangs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TTS_PRESET, selectedPresetId);
    } catch (_) {}
  }, [selectedPresetId]);

  // 🎯 홈 화면 / 갤러리에서 선택되어 넘어온 titles & videoUrls 자동 수신 & 대기열에 등록
  const lastProcessedParams = useRef<string>('');
  useEffect(() => {
    const titlesParam = searchParams.get('titles');
    const videoUrlsParam = searchParams.get('videoUrls');
    const paramKey = `${titlesParam || ''}_${videoUrlsParam || ''}`;

    if (titlesParam && lastProcessedParams.current !== paramKey) {
      lastProcessedParams.current = paramKey;
      const titles = decodeURIComponent(titlesParam).split(',').filter(Boolean);
      const urls = videoUrlsParam ? decodeURIComponent(videoUrlsParam).split(',') : [];

      const incomingItems: BatchVideoItem[] = titles.map((t, idx) => ({
        id: `incoming_${Date.now()}_${idx}`,
        name: t.endsWith('.mp4') || t.includes('.') ? t : `${t}.mp4`,
        url: urls[idx] || '',
        size: 0,
      }));

      if (incomingItems.length > 0) {
        setVideoItems(prev => {
          const existingNames = new Set(prev.map(p => p.name));
          const toAdd = incomingItems.filter(item => !existingNames.has(item.name));
          return [...prev, ...toAdd];
        });
        setRightTab('queue'); // 즉시 우측 대기열 준비 목록 탭 활성화
        toast({
          title: '홈 화면 선택 영상 수신 완료',
          description: `총 ${incomingItems.length}개의 영상이 대본+더빙 대기열에 등록되었습니다.`
        });
      }
    }
  }, [searchParams, toast]);

  // Handle preset change
  const handleSelectPreset = (preset: TTSPreset) => {
    setSelectedPresetId(preset.id);
    setCurrentTTSConfig(preset.config);
    toast({
      title: 'TTS 프리셋 적용',
      description: `${preset.name} 설정이 적용되었습니다.`
    });
  };

  // Toggle Language
  const toggleLang = (code: string) => {
    if (targetLangs.includes(code)) {
      if (targetLangs.length === 1) {
        toast({ title: '안내', description: '최소 1개 이상의 타겟 언어를 선택해야 합니다.' });
        return;
      }
      setTargetLangs(targetLangs.filter(c => c !== code));
    } else {
      setTargetLangs([...targetLangs, code]);
    }
  };

  // Handle files added locally
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(f.name));
    if (newFiles.length === 0) {
      toast({ title: '오류', description: '올바른 영상 파일(MP4, MOV 등)을 선택해주세요.', variant: 'destructive' });
      return;
    }
    const newItems: BatchVideoItem[] = newFiles.map((file, idx) => ({
      id: `file_${Date.now()}_${idx}`,
      name: file.name,
      file,
      size: file.size,
    }));

    setVideoItems(prev => [...prev, ...newItems]);
    setRightTab('queue');
    toast({
      title: '영상 파일 추가됨',
      description: `${newFiles.length}개의 영상이 준비 목록에 추가되었습니다.`
    });
  };

  // Remove single video item
  const removeVideoItem = (index: number) => {
    setVideoItems(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all video items
  const clearAllFiles = () => {
    setVideoItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY_TTS_ITEMS);
    } catch (_) {}
    toast({ title: '대기열 준비 목록이 비워졌습니다.' });
  };

  const selectedPresetObj = useMemo(() => {
    return DDALKKAK_TTS_PRESETS.find(p => p.id === selectedPresetId) || DDALKKAK_TTS_PRESETS[0];
  }, [selectedPresetId]);

  // 실시간 준비 큐 매트릭스 계산 (영상 N개 × 선택 언어 M개)
  const readyQueueItems = useMemo(() => {
    const items: Array<{
      id: string;
      itemIndex: number;
      video: BatchVideoItem;
      langCode: string;
      langInfo?: GlobalLanguage;
      preset: TTSPreset;
    }> = [];

    videoItems.forEach((video, videoIdx) => {
      targetLangs.forEach(langCode => {
        const langInfo = GLOBAL_LANGUAGES.find(l => l.code === langCode);
        items.push({
          id: `${video.name}_${langCode}_${videoIdx}`,
          itemIndex: videoIdx,
          video,
          langCode,
          langInfo,
          preset: selectedPresetObj,
        });
      });
    });

    return items;
  }, [videoItems, targetLangs, selectedPresetObj]);

  // 필터링된 준비 큐 아이템
  const filteredQueueItems = useMemo(() => {
    if (queueFilterLang === 'all') return readyQueueItems;
    return readyQueueItems.filter(item => item.langCode === queueFilterLang);
  }, [readyQueueItems, queueFilterLang]);

  // Start Batch Generation
  const handleStartBatch = async () => {
    if (videoItems.length === 0) {
      toast({ title: '안내', description: '영상 파일을 먼저 추가해주세요.' });
      return;
    }
    if (targetLangs.length === 0) {
      toast({ title: '안내', description: '타겟 언어를 선택해주세요.' });
      return;
    }

    setIsProcessing(true);
    const totalJobs = readyQueueItems.length;
    setProcessingProgress({ current: 0, total: totalJobs });

    let successCount = 0;
    let step = 0;

    for (const item of readyQueueItems) {
      step++;
      setProcessingProgress({ current: step, total: totalJobs });
      try {
        const formData = new FormData();
        if (item.video.file) {
          formData.append('video', item.video.file);
        } else if (item.video.url) {
          formData.append('original_urls', item.video.url);
          formData.append('video', new Blob([''], { type: 'video/mp4' }), item.video.name);
        } else {
          formData.append('video', new Blob([''], { type: 'video/mp4' }), item.video.name);
        }
        formData.append('target_lang', item.langCode);
        formData.append('preset_id', item.preset.id);
        formData.append('tts_config', JSON.stringify(currentTTSConfig));
        formData.append('song_title', item.video.name.replace(/\.[^/.]+$/, ''));
        await ddalkkakApi.createTtsJob(formData);
        successCount++;
      } catch (err: any) {
        console.error('TTS upload error:', err);
      }
    }

    setIsProcessing(false);
    setProcessingProgress(null);
    setVideoItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY_TTS_ITEMS);
    } catch (_) {}
    setRightTab('history');

    toast({
      title: '대본 + 더빙 작업 일괄 등록 완료',
      description: `총 ${successCount}개의 AI 대본 번역 및 더빙 작업이 등록되었습니다.`
    });
    onRefreshJobs();
  };

  const isAllSelected = jobs.length > 0 && selectedJobIds.length === jobs.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* 👈 좌측: 🛠️ 스마트 설정 패널 (5열) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="border rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs bg-card text-card-foreground border-border">
          <div className="text-xs text-muted-foreground leading-relaxed">
            영상의 음성을 인식하여 <b className="text-foreground">바이럴 대본 재구성 + 고음질 AI 더빙</b>을 일괄 생성합니다.
          </div>

          {/* 🎙️ TTS 보이스 프리셋 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Mic className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI 더빙 보이스 프리셋</span>
              </label>
              <button
                type="button"
                onClick={() => setIsTTSDialogOpen(true)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <Settings className="w-3 h-3" />
                <span>세부 음성 조절</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {DDALKKAK_TTS_PRESETS.map(preset => (
                <label
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex items-start gap-2.5 border rounded-xl p-2.5 cursor-pointer transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-indigo-500 bg-indigo-50/80 text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-200 font-bold shadow-2xs'
                      : 'border-border text-foreground hover:border-border/80 hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="tts_preset"
                    checked={selectedPresetId === preset.id}
                    onChange={() => handleSelectPreset(preset)}
                    className="mt-0.5 text-indigo-600 focus:ring-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{preset.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 🌐 20개국어 다국어 타겟 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>타겟 언어 다중 선택 ({targetLangs.length}개 선택)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAllLangs(!showAllLangs)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 hover:underline"
              >
                <span>{showAllLangs ? '5대 언어만 보기' : '+ 15개 글로벌 언어 확장'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllLangs ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* 5대 High CPM 핵심 언어 */}
            <div className="flex flex-wrap gap-1.5">
              {GLOBAL_LANGUAGES.filter(l => l.tier === 'tier1').map(lang => {
                const isSelected = targetLangs.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLang(lang.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-muted/40 border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}
            </div>

            {/* 15대 글로벌 확장 언어 */}
            {showAllLangs && (
              <div className="mt-2.5 p-3 rounded-2xl border border-border bg-muted/20 space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold text-muted-foreground mb-1">글로벌 15개국 확장 언어</div>
                <div className="flex flex-wrap gap-1.5">
                  {GLOBAL_LANGUAGES.filter(l => l.tier === 'global').map(lang => {
                    const isSelected = targetLangs.includes(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => toggleLang(lang.code)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-all border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 📁 영상 드롭존 */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-foreground">
              영상 파일 선택 (여러 개 한꺼번에 가능)
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFilesAdded(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-border hover:border-border/80 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={e => handleFilesAdded(e.target.files)}
              />
              <div className="text-3xl mb-1.5">🎙️</div>
              <div className="text-xs font-bold text-foreground">클릭하거나 영상을 여기에 드롭하세요</div>
              <div className="text-[11px] text-muted-foreground mt-1">MP4, MOV, WEBM 지원 (다중 파일 일괄 가능)</div>
            </div>

            {/* 🚀 마스터 일괄 생성 시작 버튼 */}
            <Button
              type="button"
              onClick={handleStartBatch}
              disabled={readyQueueItems.length === 0 || isProcessing}
              className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md rounded-xl h-11 transition-all"
            >
              {isProcessing ? (
                <span>AI 대본 번역 및 더빙 등록 중... ({processingProgress?.current || 0}/{processingProgress?.total || 0})</span>
              ) : (
                <span>
                  🚀 {videoItems.length}개 영상 × {targetLangs.length}개 언어 (= 총 {readyQueueItems.length}개 작업) 더빙 생성 시작
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 👉 우측: 📊 대형 작업 대시보드 (7열 - 준비 큐 테이블 & 완료 라이브러리 듀얼 탭) */}
      <div className="lg:col-span-7 space-y-3">
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-card text-card-foreground border-border">
          
          {/* 상단 서브 탭 헤더 */}
          <div className="p-3 border-b flex items-center justify-between border-border bg-muted/20">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightTab('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  rightTab === 'queue'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>대기열 준비 목록</span>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${rightTab === 'queue' ? 'bg-white/20 text-white' : ''}`}>
                  {readyQueueItems.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setRightTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  rightTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>작업 큐 & 라이브러리</span>
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${rightTab === 'history' ? 'bg-white/20 text-white' : ''}`}>
                  {jobs.length}
                </Badge>
              </button>
            </div>

            {/* 탭별 우측 액션 버튼들 */}
            <div className="flex items-center gap-1.5">
              {rightTab === 'queue' ? (
                <>
                  {readyQueueItems.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearAllFiles}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs h-7 px-2"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      <span>전체 비우기</span>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onToggleSelectAll}
                    className="text-xs h-7 rounded-lg border-border text-foreground font-medium"
                  >
                    {isAllSelected ? '선택 해제' : '전체 선택'}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={onRefreshJobs}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="새로고침"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 1️⃣ 📋 [대기열 준비 목록] 테이블 뷰 */}
          {rightTab === 'queue' && (
            <div className="p-0">
              {readyQueueItems.length > 0 ? (
                <div className="space-y-0">
                  {/* 언어별 퀵 필터 바 */}
                  <div className="px-3.5 py-2 bg-muted/10 border-b border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Filter className="w-3 h-3" /> 언어 필터:
                      </span>
                      <button
                        type="button"
                        onClick={() => setQueueFilterLang('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                          queueFilterLang === 'all' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        전체 ({readyQueueItems.length})
                      </button>
                      {targetLangs.map(code => {
                        const l = GLOBAL_LANGUAGES.find(x => x.code === code);
                        const count = readyQueueItems.filter(x => x.langCode === code).length;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setQueueFilterLang(code)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
                              queueFilterLang === code ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span>{l?.flag}</span>
                            <span>{l?.name}</span>
                            <span className="opacity-70">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 준비 목록 테이블 */}
                  <div className="max-h-[580px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/40 text-muted-foreground text-[11px] font-semibold sticky top-0 border-b border-border z-10 backdrop-blur-xs">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">영상 파일 / 소스</th>
                          <th className="py-2.5 px-3 w-36">타겟 언어</th>
                          <th className="py-2.5 px-3 w-32">AI 보이스</th>
                          <th className="py-2.5 px-3 w-24">상태</th>
                          <th className="py-2.5 px-3 w-12 text-center">제거</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredQueueItems.map((item, idx) => {
                          const formatSize = (bytes?: number) => {
                            if (!bytes || bytes === 0) return '클라우드/URL';
                            const k = 1024;
                            const sizes = ['B', 'KB', 'MB', 'GB'];
                            const i = Math.floor(Math.log(bytes) / Math.log(k));
                            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                          };

                          return (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2 min-w-0 max-w-xs sm:max-w-md">
                                  <FileVideo className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <div className="truncate font-semibold text-foreground" title={item.video.name}>
                                    {item.video.name}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    ({formatSize(item.video.size)})
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <span>{item.langInfo?.flag}</span>
                                  <span>{item.langInfo?.name || item.langCode}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[11px] font-medium text-foreground truncate block max-w-28">
                                  {item.preset.name.split('-')[0].trim()}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
                                  준비 (Ready)
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeVideoItem(item.itemIndex)}
                                  className="text-muted-foreground hover:text-rose-500 p-1 rounded transition-colors"
                                  title="이 영상 파일 목록에서 제외"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-16 px-6 text-center text-muted-foreground space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-2xl">
                    🎙️
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">대기열에 준비된 영상이 없습니다</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      홈 화면에서 영상을 선택해 일괄 작업으로 진입하거나, 좌측 드롭존에 영상을 추가하면 실시간 작업 매트릭스가 이곳에 구성됩니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2️⃣ 📊 [작업 큐 & 완료 라이브러리] 목록 뷰 */}
          {rightTab === 'history' && (
            <div className="divide-y max-h-[620px] overflow-y-auto custom-scrollbar divide-border">
              {jobs.map(job => {
                const isSelected = selectedJobIds.includes(job.id);
                const isDone = job.status === 'completed' || job.status === 'done';
                const isFailed = job.status === 'failed';
                const isRunning = !isDone && !isFailed;
                const langObj = GLOBAL_LANGUAGES.find(l => l.code === job.target_lang);

                return (
                  <div
                    key={job.id}
                    className={`p-3 transition-colors flex items-center justify-between gap-3 text-xs ${
                      isSelected ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectJob(job.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />

                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-sm bg-muted/80 text-muted-foreground">
                        🎙️
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate text-xs text-foreground">
                          {job.video_filename || `더빙 작업 #${job.id}`}
                        </div>
                        <div className="text-[11px] flex items-center gap-2 mt-0.5 text-muted-foreground">
                          <span className="font-mono">
                            {job.created_at ? new Date(job.created_at).toLocaleTimeString('ko-KR') : ''}
                          </span>
                          <span>·</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isDone
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse'
                            }`}
                          >
                            {isDone ? '완료' : isFailed ? '오류' : 'AI 더빙 생성 중'}
                          </span>
                          {job.target_lang && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-muted border border-border">
                              <span>{langObj?.flag || '🌐'}</span>
                              <span className="uppercase">{job.target_lang}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 개별 액션 버튼들 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenResult(job)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span>결과 보기</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onExportCapcut(job)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
                      >
                        <Film className="w-3 h-3 mr-1" />
                        <span>CapCut</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteJob(job.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        title="작업 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}

              {jobs.length === 0 && (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  등록된 대본+더빙 작업이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TTS 세부 설정 모달 */}
      <TTSSettingsDialog
        isOpen={isTTSDialogOpen}
        onClose={() => setIsTTSDialogOpen(false)}
        initialConfig={currentTTSConfig}
        onSaveConfig={cfg => {
          setCurrentTTSConfig(cfg);
          toast({ title: 'TTS 설정 저장됨' });
        }}
      />
    </div>
  );
};

export default TtsDubStudioTab;
