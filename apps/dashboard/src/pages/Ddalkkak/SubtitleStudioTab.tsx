import React, { useState, useRef } from 'react';
import {
  FileVideo,
  Upload,
  Sparkles,
  RefreshCw,
  Film,
  Trash2,
  Eye,
  CheckCircle2,
  Globe2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  GLOBAL_LANGUAGES,
  SUBTITLE_STYLES,
  PreparationQueueItem
} from '@/types/ddalkkak';
import { ddalkkakApi, SubtitleJob } from '@/services/ddalkkakApi';

interface SubtitleStudioTabProps {
  jobs: SubtitleJob[];
  selectedJobIds: number[];
  onToggleSelectJob: (id: number) => void;
  onToggleSelectAll: () => void;
  onRefreshJobs: () => void;
  onOpenResult: (job: SubtitleJob) => void;
  onExportCapcut: (job: SubtitleJob) => void;
  onDeleteJob: (id: number) => void;
}

export const SubtitleStudioTab: React.FC<SubtitleStudioTabProps> = ({
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

  // Style state
  const [selectedStyle, setSelectedStyle] = useState<string>('shorts');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Target languages state (Default: KO, EN, JA)
  const [targetLangs, setTargetLangs] = useState<string[]>(['ko', 'en', 'ja']);
  const [showAllLangs, setShowAllLangs] = useState<boolean>(false);

  // Video files state
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
      toast({ title: '안내', description: '영상 파일을 먼저 추가해주세요.' });
      return;
    }
    if (targetLangs.length === 0) {
      toast({ title: '안내', description: '타겟 언어를 선택해주세요.' });
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
          formData.append('style', selectedStyle);
          formData.append('song_title', file.name.replace(/\.[^/.]+$/, ''));
          if (selectedStyle === 'custom' && customPrompt.trim()) {
            formData.append('custom_prompt', customPrompt.trim());
          }
          await ddalkkakApi.createSubtitleJob(formData);
          successCount++;
        } catch (err: any) {
          console.error('Subtitle upload error:', err);
        }
      }
    }

    setIsProcessing(false);
    setVideoFiles([]);
    toast({
      title: '자막 생성 작업 등록 완료',
      description: `총 ${successCount}개의 AI 자막 생성 작업이 큐에 등록되었습니다.`
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
            영상을 올리면 <b>5종 바이럴 자막 스타일 + 후크 타이틀 + 효과음 믹스</b>가 자동 생성됩니다.
          </div>

          {/* 🎭 바이럴 자막 스타일 프리셋 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <span>🎭</span> <span>바이럴 자막 스타일</span>
              </label>
              <span className="text-[11px] text-blue-500 font-medium">5종 프리셋 + 커스텀</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {SUBTITLE_STYLES.map(style => (
                <label
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`flex items-start gap-2.5 border rounded-xl p-2.5 cursor-pointer transition-all ${
                    selectedStyle === style.id
                      ? 'border-blue-500 bg-blue-50/80 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200 font-bold shadow-2xs'
                      : 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-300 dark:hover:border-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="subtitle_style"
                    checked={selectedStyle === style.id}
                    onChange={() => setSelectedStyle(style.id)}
                    className="mt-0.5 text-blue-600 focus:ring-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold flex items-center justify-between">
                      <span>{style.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400">
                        {style.badge}
                      </Badge>
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5">{style.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {selectedStyle === 'custom' && (
              <div className="mt-2.5">
                <textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  rows={2}
                  placeholder="예: 20대 여성 타겟 뷰티 쇼츠 톤앤매너로 재치있는 쨉쨉이 자막과 효과음 추가해줘"
                  className="w-full border rounded-xl p-2.5 text-xs resize-none bg-stone-50 border-blue-500 text-stone-900 dark:bg-stone-800 dark:border-blue-500/50 dark:text-stone-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 🌐 20개국어 다국어 타겟 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <Globe2 className="w-3.5 h-3.5 text-blue-500" />
                <span>타겟 언어 다중 선택 ({targetLangs.length}개 선택)</span>
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

            {/* 5대 High CPM 핵심 언어 퀵 토글 */}
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

            {/* 15대 글로벌 확장 언어 */}
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
              영상 파일 선택 (여러 개 가능)
            </label>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { e.preventDefault(); setIsDragging(false); handleFilesAdded(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
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
              <div className="text-3xl mb-1.5">🎬</div>
              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">클릭하거나 영상을 여기에 드롭하세요</div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">MP4, MOV, WEBM 지원 (다중 파일 일괄 가능)</div>
            </div>

            {/* 📋 첨부된 파일 & 대기열 프리뷰 */}
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
                        <FileVideo className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate font-medium text-stone-800 dark:text-stone-200">{file.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                        준비 (Ready)
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🚀 자막 생성 시작 버튼 */}
            <Button
              type="button"
              onClick={handleStartBatch}
              disabled={videoFiles.length === 0 || isProcessing}
              className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md rounded-xl h-11 transition-all"
            >
              {isProcessing ? (
                <span>AI 자막 분석 및 효과음 믹스 등록 중...</span>
              ) : (
                <span>
                  🚀 {videoFiles.length}개 영상 × {targetLangs.length}개 언어 (= 총 {totalCalculatedJobs}개) 자막 생성 시작
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
                <span>📊</span> <span>자막 생성 작업 큐 & 라이브러리</span>
              </h3>
              <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 font-bold">
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
              const isRunning = !isDone && !isFailed;

              return (
                <div
                  key={job.id}
                  className={`p-3 transition-colors flex items-center justify-between gap-3 text-xs ${
                    isSelected ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-stone-50 dark:hover:bg-stone-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectJob(job.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />

                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-sm bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      🎬
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-xs text-stone-800 dark:text-stone-100">
                        {job.video_filename || `자막 작업 #${job.id}`}
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
                              : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse'
                          }`}
                        >
                          {isDone ? '완료' : isFailed ? '오류' : 'AI 분석 중'}
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
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
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
                등록된 자막 생성 작업이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
