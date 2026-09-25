import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  VideoCreativeJob,
  AudioSourceDraft,
  FramingMode,
  SubtitlePreset,
  DEFAULT_SCRIPT,
  SURFACES,
  DEFAULT_LANGUAGES,
  DEFAULT_TARGET_SOURCES,
  MAX_CONCURRENCY,
  LocalVideoFile,
  AudioMode,
} from '../video_creative/videoCreativeTypes';
import { TTSConfig } from '@/types/tts';
import { DEFAULT_TTS_CONFIG } from '../video_creative/VideoCreativeAudioSection';
import { VideoCreativeHeader } from '../video_creative/VideoCreativeHeader';
import { VideoCreativeForm } from '../video_creative/VideoCreativeForm';
import { VideoCreativeQueueSection } from '../video_creative/VideoCreativeQueueSection';

interface VideoCreativeTabProps {
  onAddBatchJobs?: (jobs: any[]) => void;
}

const STORAGE_KEY = 'vlstudio_video_creative_jobs_v1';

export const VideoCreativeTab: React.FC<VideoCreativeTabProps> = ({ onAddBatchJobs }) => {

  // ── 1. 폼 상태 머신 ──
  const [titleDraft, setTitleDraft] = useState<string>('');
  const [scriptDraft, setScriptDraft] = useState<string>(DEFAULT_SCRIPT);
  const [candidateUrlDraft, setCandidateUrlDraft] = useState<string>('');
  const [localVideoFiles, setLocalVideoFiles] = useState<LocalVideoFile[]>([]);
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(SURFACES.map(s => s.value));
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(DEFAULT_LANGUAGES.map(l => l.value));
  const [customLanguageDraft, setCustomLanguageDraft] = useState<string>('');
  const [customLanguages, setCustomLanguages] = useState<string[]>([]);
  const [jobCountDraft, setJobCountDraft] = useState<number>(1);
  const [targetSourceCountDraft, setTargetSourceCountDraft] = useState<number>(DEFAULT_TARGET_SOURCES);
  const [framingModeDraft, setFramingModeDraft] = useState<FramingMode>('scene-preserve');
  const [subtitlePresetDraft, setSubtitlePresetDraft] = useState<SubtitlePreset>('default');
  const [audioMode, setAudioMode] = useState<AudioMode>('tts');
  const [ttsConfig, setTTSConfig] = useState<TTSConfig>(DEFAULT_TTS_CONFIG);
  const [audioDraft, setAudioDraft] = useState<AudioSourceDraft>({ status: 'idle' });
  const [rewritingScript, setRewritingScript] = useState<boolean>(false);

  // ── 2. 큐 및 실행 상태 ──
  const [jobs, setJobs] = useState<VideoCreativeJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [openJobIds, setOpenJobIds] = useState<string[]>([]);
  const [queueRunning, setQueueRunning] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [workflowStartedAtMs, setWorkflowStartedAtMs] = useState<number | null>(null);

  // 로컬 스토리지 상태 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (_) {}
  }, [jobs]);

  // 타이머 틱
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Pixeling 역공학 성능 감시 옵저버 (메인 스레드 롱태스크 및 탭 반응성 추적) ──
  useEffect(() => {
    let longTaskSum = 0;
    let observer: PerformanceObserver | null = null;
    try {
      if (typeof PerformanceObserver !== 'undefined') {
        observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            longTaskSum += entry.duration;
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      }
    } catch {}

    const intervalTimer = window.setInterval(() => {
      try {
        if (longTaskSum > 1000) {
          console.warn(`최근 4s 롱태스크 ${Math.round(longTaskSum)}ms — 메인 스레드 점유형 프리즈 의심`);
        }
        longTaskSum = 0;
      } catch {}
    }, 4000);

    const activeTabStart = Date.now();
    return () => {
      window.clearInterval(intervalTimer);
      if (observer) observer.disconnect();
      const elapsed = Date.now() - activeTabStart;
      if (elapsed > 1500) {
        // 영상 창작형 탭 유지: 클릭 후 1.5s 경과에도 activeTab=${String(true)}
      }
    };
  }, []);

  // ── 3. 후보 URL 실시간 파싱 ──
  const candidateUrls = useMemo(() => {
    if (!candidateUrlDraft.trim()) return [];
    return candidateUrlDraft
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 5 && (u.startsWith('http://') || u.startsWith('https://')));
  }, [candidateUrlDraft]);

  // ── 4. 서피스 & 언어 토글 핸들러 ──
  const toggleSurface = useCallback((surface: string) => {
    setSelectedSurfaces(prev =>
      prev.includes(surface) ? prev.filter(s => s !== surface) : [...prev, surface]
    );
  }, []);

  const toggleLanguage = useCallback((lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  }, []);

  const handleAddCustomLanguage = useCallback(() => {
    const trimmed = customLanguageDraft.trim();
    if (!trimmed) return;
    if (!customLanguages.includes(trimmed)) {
      setCustomLanguages(prev => [...prev, trimmed]);
    }
    setCustomLanguageDraft('');
  }, [customLanguageDraft, customLanguages]);

  const handleRemoveCustomLanguage = useCallback((lang: string) => {
    setCustomLanguages(prev => prev.filter(l => l !== lang));
  }, []);

  // ── 5. MP3 STT 업로드 & 음성 대본 추출 ──
  const handleSelectAudioFile = async (file: File) => {
    if (!file) {
      toast.error('MP3 파일을 읽지 못했습니다.');
      return;
    }
    setAudioDraft({ status: 'loading', fileName: file.name });
    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('language', selectedLanguages[0] || 'auto');

      const res = await api.post('/video-creative/stt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });

      if (res.data?.source) {
        setAudioDraft({
          status: 'ready',
          source: res.data.source,
        });

        // 추출된 대본 텍스트에어리어에 자동 주입
        if (res.data.source.transcript) {
          setScriptDraft(res.data.source.transcript);
        }

        toast.success('🎙️ 음성 전사 완료', {
          description: `'${file.name}' (${res.data.source.timedSegments?.length || 0}개 문장) 대본이 추출되었습니다.`,
        });
      } else {
        throw new Error('STT 응답을 처리할 수 없습니다.');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || 'MP3 파일을 읽지 못했습니다.';
      setAudioDraft({ status: 'error', fileName: file.name, error: errMsg });
      toast.error('음성 추출 실패', { description: errMsg });
    }
  };

  const handleClearAudio = useCallback(() => {
    setAudioDraft({ status: 'idle' });
  }, []);

  // ── 5-1. AI 대본 후킹 강화 리라이팅 ──
  const handleRewriteScript = async () => {
    if (!scriptDraft.trim() || rewritingScript) return;
    setRewritingScript(true);
    try {
      const res = await api.post('/video-creative/rewrite-script', {
        script: scriptDraft.trim(),
        tone: 'viral_hook'
      });
      if (res.data?.rewrittenScript) {
        setScriptDraft(res.data.rewrittenScript);
        toast.success('⚡ AI 후킹 강화 완료', {
          description: `대본이 숏폼 바이럴 구조로 재작성되었습니다. (${res.data.originalLength}자 ➔ ${res.data.rewrittenLength}자)`,
        });
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || '대본 변환에 실패했습니다.';
      toast.error('AI 후킹 강화 실패', { description: errMsg });
    } finally {
      setRewritingScript(false);
    }
  };

  // ── 6. 예상 크레딧 & 예상 시간 연산 ──
  const searchLanguageCount = selectedLanguages.length + customLanguages.length;
  const estimatedCredits = useMemo(() => {
    const base = Math.max(1, Math.ceil(scriptDraft.length / 80));
    const surfacesWeight = selectedSurfaces.length * 0.5;
    const sourcesWeight = targetSourceCountDraft * 0.3;
    return Math.round((base + surfacesWeight + sourcesWeight) * 10) / 10;
  }, [scriptDraft, selectedSurfaces, targetSourceCountDraft]);

  const estimatedSeconds = useMemo(() => {
    const baseSec = Math.max(15, Math.ceil(scriptDraft.length / 10));
    const audioSec = audioDraft.status === 'ready' ? 10 : 0;
    return baseSec + audioSec + targetSourceCountDraft * 3;
  }, [scriptDraft, audioDraft, targetSourceCountDraft]);

  // ── 7. 통계 및 계산 프로퍼티 ──
  const counts = useMemo(() => {
    return jobs.reduce(
      (acc, j) => {
        acc.total += 1;
        if (j.status === 'running') acc.running += 1;
        else if (j.status === 'queued') acc.queued += 1;
        else if (j.status === 'success') acc.success += 1;
        else if (j.status === 'failed') acc.failed += 1;
        return acc;
      },
      { total: 0, running: 0, queued: 0, success: 0, failed: 0 }
    );
  }, [jobs]);

  const resultCount = counts.success + counts.failed;
  const settledCredits = useMemo(() => {
    return Math.round(jobs.filter(j => j.status === 'success').reduce((acc, j) => acc + j.creditsUsed, 0) * 10) / 10;
  }, [jobs]);
  const reservedCredits = useMemo(() => {
    return Math.round(jobs.filter(j => j.status === 'queued' || j.status === 'running').reduce((acc, j) => acc + j.creditsUsed, 0) * 10) / 10;
  }, [jobs]);
  const totalUsedCredits = settledCredits;

  const elapsedSeconds = useMemo(() => {
    if (!workflowStartedAtMs) return 0;
    const end = queueRunning ? nowMs : Math.max(workflowStartedAtMs, ...jobs.map(j => j.completedAtMs || j.updatedAtMs || 0));
    return Math.max(0, (end - workflowStartedAtMs) / 1000);
  }, [workflowStartedAtMs, queueRunning, nowMs, jobs]);

  const totalProgress = useMemo(() => {
    if (jobs.length === 0) return 0;
    return Math.round(jobs.reduce((acc, j) => acc + j.progress, 0) / jobs.length);
  }, [jobs]);

  const estimatedRemainingSeconds = useMemo(() => {
    const runningJobs = jobs.filter(j => j.status === 'running');
    const queuedJobs = jobs.filter(j => j.status === 'queued');
    let total = 0;
    for (const rj of runningJobs) {
      total += Math.max(0, rj.estimatedSeconds * (1 - rj.progress / 100));
    }
    for (const qj of queuedJobs) {
      total += qj.estimatedSeconds;
    }
    return Math.ceil(total / MAX_CONCURRENCY);
  }, [jobs]);

  const targetSourceSummary = useMemo(() => {
    if (jobs.length === 0) return `${targetSourceCountDraft}개`;
    const countsList = jobs.map(j => j.targetSourceCount);
    const unique = new Set(countsList);
    return unique.size === 1 ? `${countsList[0]}개` : `총 ${countsList.reduce((a, b) => a + b, 0)}개`;
  }, [jobs, targetSourceCountDraft]);

  const exportedCount = jobs.filter(j => j.exportStatus === 'exported').length;
  const exportingCount = jobs.filter(j => j.exportStatus === 'exporting').length;

  const canAddJobs =
    (scriptDraft.trim().length > 0 || audioDraft.status === 'ready' || localVideoFiles.length > 0) &&
    jobCountDraft >= 1 &&
    (candidateUrls.length > 0 || localVideoFiles.length > 0 || (selectedSurfaces.length > 0 && searchLanguageCount > 0));

  const hasQueuedJobs = jobs.some(j => j.status === 'queued' || j.status === 'running');
  const canStartQueue = !queueRunning && (hasQueuedJobs || canAddJobs);
  const canPauseQueue = queueRunning && hasQueuedJobs;
  const hasPausedRunningJobs = !queueRunning && jobs.some(j => j.status === 'running');
  const canBatchExport = jobs.some(j => j.status === 'success' && j.exportStatus !== 'exported') && exportingCount === 0;
  const hasResettableState =
    jobs.length > 0 ||
    localVideoFiles.length > 0 ||
    titleDraft.trim().length > 0 ||
    scriptDraft !== DEFAULT_SCRIPT ||
    candidateUrlDraft.trim().length > 0 ||
    customLanguages.length > 0 ||
    audioDraft.status !== 'idle';

  // ── 8. 작업 생성 도우미 & 추가 ──
  const createJobsFromDraft = useCallback((): VideoCreativeJob[] => {
    const surfaceLabels = SURFACES.filter(s => selectedSurfaces.includes(s.value)).map(s => s.label);
    const languageLabels = [
      ...DEFAULT_LANGUAGES.filter(l => selectedLanguages.includes(l.value)).map(l => l.label),
      ...customLanguages,
    ];

    const newJobs: VideoCreativeJob[] = [];
    for (let i = 0; i < jobCountDraft; i++) {
      const generatedTitle = titleDraft.trim() || scriptDraft.trim().split('\n')[0].slice(0, 30);
      const title = jobCountDraft > 1 ? `${generatedTitle} #${i + 1}` : generatedTitle;

      newJobs.push({
        id: `vc-job-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        script: scriptDraft.trim(),
        sourceCount: selectedSurfaces.length,
        languageCount: searchLanguageCount,
        targetSourceCount: targetSourceCountDraft,
        candidateUrls: [...candidateUrls],
        localVideoFiles: [...localVideoFiles],
        audioMode,
        searchSurfaceValues: [...selectedSurfaces],
        searchSurfaceLabels: surfaceLabels,
        searchLanguageValues: [...selectedLanguages, ...customLanguages],
        searchLanguageLabels: languageLabels,
        framingMode: framingModeDraft,
        subtitlePreset: subtitlePresetDraft,
        audioSource: audioDraft.status === 'ready' ? audioDraft.source : undefined,
        status: 'queued',
        stage: 'search',
        progress: 0,
        creditsUsed: estimatedCredits,
        estimatedSeconds,
        exportStatus: 'none',
        analysis: {
          entities: [],
          scenes: [],
        },
        downloadedSources: [],
      });
    }
    return newJobs;
  }, [
    titleDraft,
    scriptDraft,
    jobCountDraft,
    selectedSurfaces,
    searchLanguageCount,
    targetSourceCountDraft,
    candidateUrls,
    localVideoFiles,
    audioMode,
    selectedLanguages,
    customLanguages,
    framingModeDraft,
    subtitlePresetDraft,
    audioDraft,
    estimatedCredits,
    estimatedSeconds,
  ]);

  const handleAddJobs = () => {
    if (!canAddJobs) {
      toast.error('대본을 먼저 입력하거나 MP3 음성을 선택해 주세요.');
      return;
    }

    const newJobs = createJobsFromDraft();
    setJobs(prev => [...newJobs, ...prev]);
    toast.success('📋 작업 대기열 등록 완료', {
      description: `${newJobs.length}개의 영상 창작형 작업이 큐에 추가되었습니다. '큐 시작'을 눌러 조립하세요.`,
    });
  };

  // ── 9. 작업 단일 및 일괄 제어 ──
  const handleToggleJobOpen = (id: string) => {
    setOpenJobIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const handleRemoveJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    setOpenJobIds(prev => prev.filter(i => i !== id));
    toast.info('작업이 삭제되었습니다.');
  };

  const handleRetryJob = (id: string) => {
    setJobs(prev =>
      prev.map(j =>
        j.id === id
          ? {
              ...j,
              status: 'queued',
              stage: 'search',
              progress: 0,
              error: undefined,
              warning: undefined,
              exportStatus: 'none',
              updatedAtMs: Date.now(),
            }
          : j
      )
    );
    toast.info('🔄 작업 재시도 등록 완료');
  };

  const handleLoadJobSettings = (job: VideoCreativeJob) => {
    setTitleDraft(job.title);
    setScriptDraft(job.script);
    setCandidateUrlDraft(job.candidateUrls.join('\n'));
    setSelectedSurfaces(job.searchSurfaceValues.filter(s => SURFACES.some(sf => sf.value === s)));
    setSelectedLanguages(job.searchLanguageValues.filter(l => DEFAULT_LANGUAGES.some(dl => dl.value === l)));
    setCustomLanguages(job.searchLanguageValues.filter(l => !DEFAULT_LANGUAGES.some(dl => dl.value === l)));
    setTargetSourceCountDraft(job.targetSourceCount);
    setFramingModeDraft(job.framingMode);
    setSubtitlePresetDraft(job.subtitlePreset || 'default');
    if (job.audioSource) {
      setAudioDraft({ status: 'ready', source: job.audioSource });
    }
    toast.success('⚙️ 작업 설정 불러오기 완료', { description: '입력 폼에 설정값이 복원되었습니다.' });
  };

  const handleResetAll = () => {
    setTitleDraft('');
    setScriptDraft(DEFAULT_SCRIPT);
    setCandidateUrlDraft('');
    setLocalVideoFiles([]);
    setSelectedSurfaces(SURFACES.map(s => s.value));
    setSelectedLanguages(DEFAULT_LANGUAGES.map(l => l.value));
    setCustomLanguageDraft('');
    setCustomLanguages([]);
    setJobCountDraft(1);
    setTargetSourceCountDraft(DEFAULT_TARGET_SOURCES);
    setFramingModeDraft('scene-preserve');
    setSubtitlePresetDraft('default');
    setAudioMode('tts');
    setAudioDraft({ status: 'idle' });
    setJobs([]);
    setOpenJobIds([]);
    setQueueRunning(false);
    setWorkflowStartedAtMs(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success('🧹 영상 창작형 전체 초기화 완료');
  };

  const handleResetQueue = () => {
    setJobs([]);
    setOpenJobIds([]);
    setQueueRunning(false);
    localStorage.removeItem(STORAGE_KEY);
    toast.info('큐 비우기 완료');
  };

  const handleStartQueue = () => {
    const hasQueued = jobs.some(j => j.status === 'queued' || j.status === 'running');
    if (hasQueued) {
      setQueueRunning(true);
      if (!workflowStartedAtMs) setWorkflowStartedAtMs(Date.now());
      toast.success('⚡ 큐 가동 시작', { description: '대기 중인 작업을 순차적으로 조립합니다.' });
      return;
    }

    if (canAddJobs) {
      const newJobs = createJobsFromDraft();
      setJobs(prev => [...newJobs, ...prev]);
      setQueueRunning(true);
      if (!workflowStartedAtMs) setWorkflowStartedAtMs(Date.now());
      toast.success('⚡ 1-클릭 즉시 생성 시작', {
        description: `'${newJobs[0]?.title || '새 작업'}'이 대기열에 등록되고 즉시 조립을 시작합니다.`,
      });
      return;
    }

    toast.error('대본을 먼저 입력하거나 MP3 음성을 선택해 주세요.');
  };

  const handlePauseQueue = () => {
    setQueueRunning(false);
    toast.info('⏸️ 큐 진행 일시정지');
  };

  const handleLoadSampleScript = useCallback(() => {
    setTitleDraft('맛있는 김치찌개 황금레시피');
    setScriptDraft(
      '한국인이 가장 사랑하는 소울푸드, 진하고 얼큰한 김치찌개 황금레시피입니다.\n' +
      '첫 번째 비법은 잘 달궈진 냄비에 돼지고기와 참기름을 넣고 겉면이 노릇해질 때까지 볶아주는 것입니다.\n' +
      '두 번째 비법은 푹 익은 묵은지를 송송 썰어 넣고 김칫국물 두 국자와 함께 센 불에서 자작하게 졸이듯 볶는 것입니다.\n' +
      '여기에 멸치 다시마 육수를 붓고 다진 마늘과 고춧가루를 듬뿍 넣어 한소끔 끓여줍니다.\n' +
      '마지막으로 두부와 대파를 가지런히 올리고 중불에서 은근하게 5분간 끓여내면 깊은 감칠맛의 김치찌개가 완성됩니다!'
    );
    toast.success('📝 예시 대본 불러오기 완료', {
      description: '김치찌개 황금레시피 대본이 입력되었습니다. 즉시 생성을 눌러 조립해보세요.',
    });
  }, []);

  // ── 10. CapCut 초안 조립 & 내보내기 ──
  const handleExportJob = async (jobId: string) => {
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) return;

    setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, exportStatus: 'exporting' } : j)));

    try {
      const res = await api.post('/video-creative/assemble', {
        project_title: targetJob.title,
        script: targetJob.script,
        scenes: targetJob.analysis.scenes,
        downloaded_sources: targetJob.downloadedSources,
        audio_source: targetJob.audioSource,
        framing_mode: targetJob.framingMode,
        subtitle_preset: targetJob.subtitlePreset || 'default',
        entities: targetJob.analysis.entities,
        candidate_urls: targetJob.candidateUrls,
      });

      if (res.data?.success) {
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  exportStatus: 'exported',
                  capcutDraftPath: res.data.draftPath,
                  capcutDraftFolder: res.data.draftFolder,
                  updatedAtMs: Date.now(),
                }
              : j
          )
        );

        if (onAddBatchJobs) {
          onAddBatchJobs([
            {
              id: targetJob.id,
              title: `[영상창작] ${targetJob.title}`,
              sourceType: 'video',
              archetype: 'classic',
              tabId: 'video-creative',
              createdAt: new Date().toLocaleTimeString(),
              status: 'done',
              video_path: res.data.draftFolder,
              metadata: {
                capcutDraftPath: res.data.draftPath,
                capcutDraftFolder: res.data.draftFolder,
                clipCount: res.data.clipCount,
                textCount: res.data.textCount,
              },
            },
          ]);
        }

        toast.success('🎬 CapCut 초안 생성 완료', {
          description: `'${targetJob.title}' CapCut 초안(draft_content.json)이 준비되었습니다.`,
        });
      } else {
        throw new Error('CapCut 조립 응답 실패');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.detail || e.message || 'CapCut 초안 생성 중 오류가 발생했습니다.';
      setJobs(prev => prev.map(j => (j.id === jobId ? { ...j, exportStatus: 'none', error: errMsg } : j)));
      toast.error('초안 생성 실패', { description: errMsg });
    }
  };

  const handleBatchExport = async () => {
    const successJobs = jobs.filter(j => j.status === 'success' && j.exportStatus !== 'exported');
    if (successJobs.length === 0) return;

    for (const j of successJobs) {
      await handleExportJob(j.id);
    }
  };

  const handleOpenCapcutDraftFolder = async (draftFolder: string) => {
    if (!draftFolder) return;
    try {
      await api.post('/video-creative/open-draft', { draft_path: draftFolder, mode: 'folder' });
      toast.success('📂 CapCut 프로젝트 폴더 열기');
    } catch (e: any) {
      toast.error('폴더 열기 실패', { description: e.message });
    }
  };

  const handleRevealCapcutDraft = async (draftPath: string) => {
    if (!draftPath) return;
    try {
      await api.post('/video-creative/open-draft', { draft_path: draftPath, mode: 'file' });
      toast.success('📄 draft_content.json 파일 위치 열기');
    } catch (e: any) {
      toast.error('파일 위치 보기 실패', { description: e.message });
    }
  };

  // ── 11. 백그라운드 5단계 단일 파이프라인 프로세서 ──
  const processingRef = useRef<Set<string>>(new Set());

  const runJobPipeline = useCallback(
    async (jobId: string) => {
      if (processingRef.current.has(jobId)) return;
      processingRef.current.add(jobId);

      try {
        let currentJob = jobs.find(j => j.id === jobId);
        if (!currentJob) return;

        // [1단계: 검색/대본분석 - Stage 'search']
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? { ...j, status: 'running', stage: 'search', progress: 20, startedAtMs: j.startedAtMs || Date.now() }
              : j
          )
        );

        const analyzeRes = await api.post('/video-creative/analyze', {
          script: currentJob.script,
          title: currentJob.title,
          surfaces: currentJob.searchSurfaceValues,
          languages: currentJob.searchLanguageValues,
        }, { timeout: 60000 });

        const entities = analyzeRes.data?.entities || [];
        const scenes = analyzeRes.data?.scenes || [];
        const resolvedTitle = analyzeRes.data?.title || currentJob.title;

        // [1-1단계: 오디오 소스 확인 및 필요 시 자동 TTS 생성]
        let effectiveAudioSource = currentJob.audioSource;
        if (!effectiveAudioSource && currentJob.audioMode === 'tts') {
          try {
            setJobs(prev =>
              prev.map(j =>
                j.id === jobId
                  ? { ...j, stage: 'search', progress: 30, updatedAtMs: Date.now() }
                  : j
              )
            );
            const ttsRes = await api.post('/video-creative/generate-tts', {
              text: currentJob.script,
              engine: ttsConfig.engine,
              language: ttsConfig.language,
              voice_id: ttsConfig.voice_id,
              rate: Math.round((ttsConfig.speed - 1.0) * 100),
              pitch: ttsConfig.pitch,
              emotion: ttsConfig.emotion || 'normal',
              silence_enabled: ttsConfig.use_silence_removal || false,
            }, { timeout: 60000 });

            if (ttsRes.data?.audioPath) {
              effectiveAudioSource = {
                filename: ttsRes.data.filename,
                path: ttsRes.data.audioPath,
                durationMs: ttsRes.data.durationMs,
                transcript: currentJob.script,
                timedSegments: ttsRes.data.segments?.map((seg: any, idx: number) => ({
                  id: idx + 1,
                  text: seg.text,
                  startMs: seg.startMs,
                  endMs: seg.endMs,
                  durationMs: seg.durationMs,
                })) || [],
              };
            }
          } catch (ttsErr: any) {
            console.warn('[VideoCreative] Auto TTS generation warning:', ttsErr);
          }
        }

        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  title: resolvedTitle,
                  analysis: { entities, scenes },
                  audioSource: effectiveAudioSource,
                  stage: 'download',
                  progress: 45,
                  updatedAtMs: Date.now(),
                }
              : j
          )
        );

        // [2~3단계: 다운로드 및 매칭 - Stage 'download' / 'matching']
        setJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, stage: 'matching', progress: 60 } : j))
        );

        const matchRes = await api.post('/video-creative/match-clips', {
          scenes,
          candidate_urls: currentJob.candidateUrls,
          local_video_paths: currentJob.localVideoFiles?.map(f => f.filePath) || [],
          target_source_count: currentJob.targetSourceCount,
          surfaces: currentJob.searchSurfaceValues,
          languages: currentJob.searchLanguageValues,
        }, { timeout: 120000 });

        const downloadedSources = matchRes.data?.downloadedSources || [];
        const candidateDownloadFailed = downloadedSources.length === 0 && currentJob.candidateUrls.length > 0 && (!currentJob.localVideoFiles || currentJob.localVideoFiles.length === 0);
        const warningNotice = candidateDownloadFailed
          ? '입력된 후보 영상을 다운로드하지 못해 온라인 검색/로컬 영상으로 대체되었습니다.'
          : undefined;

        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  downloadedSources,
                  warning: warningNotice,
                  stage: 'edit',
                  progress: 80,
                  updatedAtMs: Date.now(),
                }
              : j
          )
        );

        // [4단계: 편집 동기화 - Stage 'edit']
        await new Promise(res => setTimeout(res, 400));

        // [5단계: CapCut 초안 조립 - Stage 'capcut']
        setJobs(prev =>
          prev.map(j => (j.id === jobId ? { ...j, stage: 'capcut', progress: 90 } : j))
        );

        const assembleRes = await api.post('/video-creative/assemble', {
          project_title: resolvedTitle,
          script: currentJob.script,
          scenes,
          downloaded_sources: downloadedSources,
          audio_source: effectiveAudioSource,
          framing_mode: currentJob.framingMode,
          subtitle_preset: currentJob.subtitlePreset || 'default',
          entities,
          candidate_urls: currentJob.candidateUrls,
        }, { timeout: 120000 });

        if (assembleRes.data?.success) {
          setJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? {
                    ...j,
                    status: 'success',
                    stage: 'capcut',
                    progress: 100,
                    capcutDraftPath: assembleRes.data.draftPath,
                    capcutDraftFolder: assembleRes.data.draftFolder,
                    completedAtMs: Date.now(),
                    updatedAtMs: Date.now(),
                  }
                : j
            )
          );

          toast.success('🎬 CapCut 초안 완성!', {
            description: `'${resolvedTitle}' CapCut 초안이 성공적으로 생성되었습니다.`,
          });

          if (onAddBatchJobs) {
            onAddBatchJobs([
              {
                id: currentJob.id,
                title: `[영상창작] ${resolvedTitle}`,
                sourceType: 'video',
                archetype: 'classic',
                tabId: 'video-creative',
                createdAt: new Date().toLocaleTimeString(),
                status: 'ready',
                metadata: {
                  capcutDraftPath: assembleRes.data.draftPath,
                  capcutDraftFolder: assembleRes.data.draftFolder,
                  clipCount: assembleRes.data.clipCount,
                },
              },
            ]);
          }
        } else {
          throw new Error('초안 조립 완료 응답 부재');
        }
      } catch (e: any) {
        const errMsg = e.response?.data?.detail || e.message || '작업 처리 중 오류 발생';
        setJobs(prev =>
          prev.map(j =>
            j.id === jobId
              ? {
                  ...j,
                  status: 'failed',
                  error: errMsg,
                  completedAtMs: Date.now(),
                  updatedAtMs: Date.now(),
                }
              : j
          )
        );
        toast.error('작업 실패', { description: errMsg });
      } finally {
        processingRef.current.delete(jobId);
      }
    },
    [jobs, onAddBatchJobs]
  );

  // 큐 러너 루프
  useEffect(() => {
    if (!queueRunning) return;

    const runningCount = jobs.filter(j => j.status === 'running').length;
    const queuedJobs = jobs.filter(j => j.status === 'queued');

    const slotsAvailable = MAX_CONCURRENCY - runningCount;
    if (slotsAvailable > 0 && queuedJobs.length > 0) {
      const nextBatch = queuedJobs.slice(0, slotsAvailable);
      for (const j of nextBatch) {
        runJobPipeline(j.id);
      }
    } else if (queuedJobs.length === 0 && runningCount === 0) {
      setQueueRunning(false);
      toast.success('🎉 모든 작업 조립 완료', {
        description: '영상 창작형 대기열의 모든 프로젝트가 완성되었습니다.',
      });
    }
  }, [queueRunning, jobs, runJobPipeline]);

  return (
    <div data-pixi-video-creative-batch-tab="true" className="space-y-6">
      {hasPausedRunningJobs && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
          <span className="font-bold">진행 확인과 다음 단계 시작이 멈췄습니다. 이미 요청된 영상 다운로드는 백그라운드에서 완료될 수 있습니다.</span>
        </div>
      )}

      {/* 1. 마스터 헤더 & 6대 메트릭 & 전체 초기화 */}
      <VideoCreativeHeader
        totalCount={counts.total}
        runningCount={counts.running}
        queuedCount={counts.queued}
        successCount={counts.success}
        failedCount={counts.failed}
        elapsedSeconds={elapsedSeconds}
        hasResettableState={hasResettableState}
        onResetAll={handleResetAll}
      />

      {/* 2. 원천 KP 입력 폼 */}
      <VideoCreativeForm
        titleDraft={titleDraft}
        setTitleDraft={setTitleDraft}
        scriptDraft={scriptDraft}
        setScriptDraft={setScriptDraft}
        candidateUrlDraft={candidateUrlDraft}
        setCandidateUrlDraft={setCandidateUrlDraft}
        candidateUrls={candidateUrls}
        localVideoFiles={localVideoFiles}
        setLocalVideoFiles={setLocalVideoFiles}
        selectedSurfaces={selectedSurfaces}
        toggleSurface={toggleSurface}
        selectedLanguages={selectedLanguages}
        toggleLanguage={toggleLanguage}
        customLanguageDraft={customLanguageDraft}
        setCustomLanguageDraft={setCustomLanguageDraft}
        customLanguages={customLanguages}
        onAddCustomLanguage={handleAddCustomLanguage}
        onRemoveCustomLanguage={handleRemoveCustomLanguage}
        jobCountDraft={jobCountDraft}
        setJobCountDraft={setJobCountDraft}
        targetSourceCountDraft={targetSourceCountDraft}
        setTargetSourceCountDraft={setTargetSourceCountDraft}
        framingModeDraft={framingModeDraft}
        setFramingModeDraft={setFramingModeDraft}
        subtitlePresetDraft={subtitlePresetDraft}
        setSubtitlePresetDraft={setSubtitlePresetDraft}
        audioMode={audioMode}
        setAudioMode={setAudioMode}
        ttsConfig={ttsConfig}
        setTTSConfig={setTTSConfig}
        audioDraft={audioDraft}
        onAudioDraftChange={setAudioDraft}
        onSelectAudioFile={handleSelectAudioFile}
        onClearAudio={handleClearAudio}
        onRewriteScript={handleRewriteScript}
        rewritingScript={rewritingScript}
        canAddJobs={canAddJobs}
        onAddJobs={handleAddJobs}
        queueRunning={queueRunning}
        canStartQueue={canStartQueue}
        canPauseQueue={canPauseQueue}
        hasPausedRunningJobs={hasPausedRunningJobs}
        hasQueuedJobs={hasQueuedJobs}
        queuedCount={jobs.filter(j => j.status === 'queued' || j.status === 'running').length}
        onInstantStart={handleStartQueue}
        onLoadSampleScript={handleLoadSampleScript}
        onStartQueue={handleStartQueue}
        onPauseQueue={handlePauseQueue}
        onResetQueue={handleResetQueue}
        estimatedCredits={estimatedCredits}
        estimatedSeconds={estimatedSeconds}
      />

      {/* 3. 원천 KU 실행 현황 & 5단계 파이프라인 & 작업 리스트 */}
      <VideoCreativeQueueSection
        jobs={jobs}
        openJobIds={openJobIds}
        onToggleJobOpen={handleToggleJobOpen}
        onRetryJob={handleRetryJob}
        onExportJob={handleExportJob}
        onRemoveJob={handleRemoveJob}
        onLoadJobSettings={handleLoadJobSettings}
        onOpenCapcutDraftFolder={handleOpenCapcutDraftFolder}
        onRevealCapcutDraft={handleRevealCapcutDraft}
        canBatchExport={canBatchExport}
        onBatchExport={handleBatchExport}
        reservedCredits={reservedCredits}
        settledCredits={settledCredits}
        totalUsedCredits={totalUsedCredits}
        estimatedRemainingSeconds={estimatedRemainingSeconds}
        exportedCount={exportedCount}
        exportingCount={exportingCount}
        resultCount={resultCount}
        totalProgress={totalProgress}
        selectedSurfacesCount={selectedSurfaces.length}
        searchLanguageCount={searchLanguageCount}
        targetSourceSummary={targetSourceSummary}
      />
    </div>
  );
};
