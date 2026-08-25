import React, { useState, useRef } from 'react';
import {
  Mic,
  Settings,
  Globe2,
  RefreshCw,
  Eye,
  Film,
  Trash2,
  ChevronDown,
  FileVideo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  GLOBAL_LANGUAGES,
  DDALKKAK_TTS_PRESETS,
  TTSPreset
} from '@/types/ddalkkak';
import { ddalkkakApi, TtsDubJob } from '@/services/ddalkkakApi';
import TTSSettingsDialog from '@/components/TTSSettingsDialog';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset & TTS Settings state (Default: Piljae)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_piljae');
  const [isTTSDialogOpen, setIsTTSDialogOpen] = useState<boolean>(false);
  const [currentTTSConfig, setCurrentTTSConfig] = useState<any>(DDALKKAK_TTS_PRESETS[0].config);

  // Target languages state (Default: KO, EN)
  const [targetLangs, setTargetLangs] = useState<string[]>(['ko', 'en']);
  const [showAllLangs, setShowAllLangs] = useState<boolean>(false);

  // Video files state
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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

  // Handle files added
  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(f.name));
    if (newFiles.length === 0) {
      toast({ title: '오류', description: '올바른 영상 파일(MP4, MOV 등)을 선택해주세요.', variant: 'destructive' });
      return;
    }
    setVideoFiles(prev => [...prev, ...newFiles]);
  };

  // Start Batch Generation
  const handleStartBatch = async () => {
    if (videoFiles.length === 0) {
      toast({ title: '안내', description: '더빙할 영상 파일을 먼저 추가해주세요.' });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;

    for (const file of videoFiles) {
      for (const lang of targetLangs) {
        try {
          const formData = new FormData();
          formData.append('video', file);
          formData.append('target_lang', lang);
          formData.append('tts_engine', currentTTSConfig.engine || 'typecast');
          formData.append('voice_id', currentTTSConfig.voice_id || '');
          formData.append('speed', String(currentTTSConfig.speed || 1.4));
          formData.append('pitch', String(currentTTSConfig.pitch || 0));
          formData.append('use_silence_removal', String(currentTTSConfig.use_silence_removal !== false));
          formData.append('silence_threshold', String(currentTTSConfig.silence_threshold || -40));
          formData.append('min_silence_len', String(currentTTSConfig.min_silence_len || 300));
          formData.append('keep_silence_len', String(currentTTSConfig.keep_silence_len || 50));
          
          await ddalkkakApi.createTtsJob(formData);
          successCount++;
        } catch (err: any) {
          console.error('TTS dubbing upload error:', err);
        }
      }
    }

    setIsProcessing(false);
    setVideoFiles([]);
    toast({
      title: '대본+더빙 작업 등록 완료',
      description: `총 ${successCount}개의 AI 대본+더빙 작업이 큐에 등록되었습니다.`
    });
    onRefreshJobs();
  };

  const totalCalculatedJobs = videoFiles.length * targetLangs.length;
  const isAllSelected = jobs.length > 0 && selectedJobIds.length === jobs.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* 👈 좌측 고속 작업 생성 패널 (5열) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="border rounded-3xl p-5 space-y-4 shadow-sm bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <div className="text-xs text-stone-600 dark:text-stone-300">
            영상을 올리면 <b>풀 스토리 대본 · 상단 후크타이틀 · 유튜브 메타데이터</b> + <b>스튜디오급 AI 더빙 음성</b> + <b>SRT 자막</b>이 자동 생성됩니다.
          </div>

          {/* 🎙️ TTS 사전 세팅 프리셋 시스템 */}
          <div className="p-3.5 border rounded-2xl space-y-2.5 bg-stone-50 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <Mic className="w-3.5 h-3.5 text-amber-500" />
                <span>TTS 음성 프리셋 & 엔진</span>
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsTTSDialogOpen(true)}
                className="text-xs h-7 px-2.5 rounded-lg border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                <Settings className="w-3 h-3" />
                <span>TTS 고급 설정</span>
              </Button>
            </div>

            {/* 5대 기본 프리셋 라디오 */}
            <div className="grid grid-cols-1 gap-1.5">
              {DDALKKAK_TTS_PRESETS.map(preset => (
                <label
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex items-start gap-2.5 border rounded-xl p-2.5 cursor-pointer transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-amber-500 bg-amber-50/80 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 font-bold shadow-2xs'
                      : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="tts_preset"
                    checked={selectedPresetId === preset.id}
                    onChange={() => handleSelectPreset(preset)}
                    className="mt-0.5 text-amber-600 focus:ring-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">{preset.name}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{preset.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-200 dark:border-stone-800">
              엔진: {currentTTSConfig.engine || 'typecast'} · 속도: {currentTTSConfig.speed || 1.4}x · 무음제거: {currentTTSConfig.use_silence_removal !== false ? 'On' : 'Off'}
            </div>
          </div>

          {/* 🌐 다국어 타겟 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                <span>더빙 타겟 언어 ({targetLangs.length}개 선택)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAllLangs(!showAllLangs)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-0.5 hover:underline"
              >
                <span>{showAllLangs ? '5대 언어만 보기' : '+ 15개 글로벌 언어 확장'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showAllLangs ? 'rotate-180' : ''}`} />
              </button>
            </div>

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
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                );
              })}
            </div>

            {showAllLangs && (
              <div className="mt-2.5 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/40 space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 mb-1">글로벌 15개국 확장 언어</div>
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
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
            <label className="block text-xs font-bold mb-1.5 text-stone-800 dark:text-stone-200">
              영상 파일 (MP4 / MOV)
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFilesAdded(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-stone-300 hover:border-stone-400 bg-stone-50 dark:border-stone-700 dark:hover:border-stone-500 dark:bg-stone-950/40'
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
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">더빙할 영상 파일을 드롭하거나 클릭하세요</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">대본 생성 + TTS 음성 합성 자동 진행</div>
            </div>

            {/* 첨부된 파일 & 대기열 프리뷰 */}
            {videoFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
                  <span>대기열 준비 목록 ({videoFiles.length}개 영상)</span>
                  <button type="button" onClick={() => setVideoFiles([])} className="text-rose-500 text-[11px] hover:underline font-semibold">
                    비우기
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {videoFiles.map((file, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileVideo className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="truncate font-medium text-stone-800 dark:text-stone-200">{file.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        준비 (Ready)
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🚀 대본+더빙 생성 시작 버튼 */}
            <Button
              type="button"
              onClick={handleStartBatch}
              disabled={videoFiles.length === 0 || isProcessing}
              className="w-full mt-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md rounded-xl h-11 transition-all"
            >
              {isProcessing ? (
                <span>AI 대본 생성 및 TTS 합성 등록 중...</span>
              ) : (
                <span>
                  🚀 {videoFiles.length}개 영상 × {targetLangs.length}개 언어 (= 총 {totalCalculatedJobs}개) 대본+더빙 시작
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 👉 우측 실시간 작업 큐 & 라이브러리 (7열) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <div className="p-3.5 border-b flex items-center justify-between border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <span>📊</span> <span>대본+더빙 작업 큐 & 라이브러리</span>
              </h3>
              <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-bold">
                {jobs.length}개 작업
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onToggleSelectAll}
                className="text-xs h-7 rounded-lg border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold"
              >
                {isAllSelected ? '선택 해제' : '전체 선택'}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onRefreshJobs}
                className="h-7 w-7 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                title="새로고침"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* 작업 행 목록 */}
          <div className="divide-y max-h-[620px] overflow-y-auto divide-stone-100 dark:divide-stone-800/60">
            {jobs.map(job => {
              const isSelected = selectedJobIds.includes(job.id);
              const isDone = job.status === 'completed' || job.status === 'done';
              const isFailed = job.status === 'failed';

              return (
                <div
                  key={job.id}
                  className={`p-3 transition-colors flex items-center justify-between gap-3 text-xs ${
                    isSelected ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-stone-50 dark:hover:bg-stone-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectJob(job.id)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />

                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-sm bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      🎙️
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-xs text-stone-800 dark:text-stone-100">
                        {job.video_filename || `더빙 작업 #${job.id}`}
                      </div>
                      <div className="text-[11px] flex items-center gap-2 mt-0.5 text-stone-500 dark:text-stone-400">
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
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                          }`}
                        >
                          {isDone ? '완료' : isFailed ? '오류' : 'AI 합성 중'}
                        </span>
                        {job.target_lang && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 uppercase font-bold">
                            {job.target_lang}
                          </Badge>
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
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
                    >
                      <Film className="w-3 h-3 mr-1" />
                      <span>CapCut</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteJob(job.id)}
                      className="h-7 w-7 text-stone-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {jobs.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500">
                등록된 대본+더빙 작업이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TTS 고급 설정 다이얼로그 */}
      <TTSSettingsDialog
        open={isTTSDialogOpen}
        onOpenChange={setIsTTSDialogOpen}
        initialConfig={currentTTSConfig}
        onSave={cfg => {
          setCurrentTTSConfig(cfg);
          toast({ title: 'TTS 설정 저장 완료', description: '새로운 음성 및 속도 설정이 적용되었습니다.' });
        }}
      />
    </div>
  );
};
