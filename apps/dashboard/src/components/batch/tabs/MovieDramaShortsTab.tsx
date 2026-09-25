import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  Clapperboard,
  Tv,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  MovieDramaSetupSection,
  MovieDramaSetupSettings
} from '../movie_drama/MovieDramaSetupSection';
import {
  MovieDramaAnalysisSection,
  MovieDramaJob
} from '../movie_drama/MovieDramaAnalysisSection';
import { MovieDramaResultsSection } from '../movie_drama/MovieDramaResultsSection';
import {
  MovieDramaFramingModal,
  FramingCut
} from '../movie_drama/MovieDramaFramingModal';
import { CandidateData } from '../movie_drama/MovieDramaCandidateCard';
import { cn } from '@/lib/utils';

interface MovieDramaShortsTabProps {
  onAddBatchJobs?: (jobs: any[]) => void;
}

export const MovieDramaShortsTab: React.FC<MovieDramaShortsTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 3대 워크스페이스 상태 머신 (Po)
  const [activeStep, setActiveStep] = useState<'setup' | 'analysis' | 'results'>('setup');

  // 원본 비디오 상태
  const [selectedVideoPath, setSelectedVideoPath] = useState<string | null>(null);
  const [selectedVideoName, setSelectedVideoName] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<{ duration?: number; size?: number; width?: number; height?: number } | null>(null);

  // 설정 상태 (Fx)
  const [settings, setSettings] = useState<MovieDramaSetupSettings>({
    targetShortsCount: 3,
    deliveryMode: 'full_tts',
    layoutPreset: 'full_bleed',
    seriesMode: true,
    voiceId: 'F1',
    styleSettings: {}
  });

  const [rightsConfirmed, setRightsConfirmed] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // 작업 및 후보 데이터
  const [currentJob, setCurrentJob] = useState<MovieDramaJob | null>(null);
  const [candidates, setCandidates] = useState<CandidateData[]>([]);

  // 렌더링 및 출력 상태
  const [renderingCandidateId, setRenderingCandidateId] = useState<string | null>(null);
  const [isBatchRendering, setIsBatchRendering] = useState<boolean>(false);
  const [completedMp4Map, setCompletedMp4Map] = useState<Record<string, string>>({});

  const [exportingCandidateId, setExportingCandidateId] = useState<string | null>(null);
  const [isBatchExportingCapcut, setIsBatchExportingCapcut] = useState<boolean>(false);
  const [localDrafts, setLocalDrafts] = useState<Array<{ candidateId: string; draftPath: string; title: string }>>([]);

  const [packingCandidateId, setPackingCandidateId] = useState<string | null>(null);
  const [isInstallingPack, setIsInstallingPack] = useState<boolean>(false);
  const [isUploadingSource, setIsUploadingSource] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

  // 프레이밍 모달 상태 (R6)
  const [framingModalOpen, setFramingModalOpen] = useState<boolean>(false);
  const [activeFramingCandidate, setActiveFramingCandidate] = useState<CandidateData | null>(null);
  const [isSavingFraming, setIsSavingFraming] = useState<boolean>(false);

  // 에러 메시지 배너
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string } | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 마운트 시 최근 작업 목록 조회
  useEffect(() => {
    fetchRecentJob();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleStartNewJob = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setCurrentJob(null);
    setCandidates([]);
    setSelectedVideoPath(null);
    setSelectedVideoName(null);
    setVideoInfo(null);
    setErrorMessage(null);
    setActiveStep('setup');
    toast({
      title: '새 작업 모드',
      description: '새로운 원본 영상을 선택하여 쇼츠를 제작할 수 있습니다.'
    });
  };

  const fetchRecentJob = async () => {
    try {
      const resp = await fetch('/api/ve/movie-drama-shorts/jobs');
      if (resp.ok) {
        const jobs: MovieDramaJob[] = await resp.json();
        // 1. 진행 중인 작업이 있으면 즉시 analysis로 복구 및 폴링
        const processingJob = jobs.find(j => j.status === 'processing');
        if (processingJob) {
          setCurrentJob(processingJob);
          setSelectedVideoName(processingJob.source?.originalName || null);
          if (processingJob.source?.canonicalPath) {
            setSelectedVideoPath(processingJob.source.canonicalPath);
          }
          if (processingJob.source?.media) {
            setVideoInfo(processingJob.source.media);
          }
          setActiveStep('analysis');
          startPolling(processingJob.id);
          return;
        }

        // 2. 완료된 최근 작업이 있으면 결과 데이터 미리 로드하되, 시작 화면은 setup으로 유지
        const completedJob = jobs.find(j => j.status === 'completed');
        if (completedJob) {
          setCurrentJob(completedJob);
          setSelectedVideoName(completedJob.source?.originalName || null);
          if (completedJob.source?.canonicalPath) {
            setSelectedVideoPath(completedJob.source.canonicalPath);
          }
          if (completedJob.source?.media) {
            setVideoInfo(completedJob.source.media);
          }
          await loadCandidates(completedJob.id);
        }
      }
    } catch (_) {
      // ignore on startup
    }
  };

  const loadCandidates = async (jobId: string) => {
    try {
      const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${jobId}/candidates`);
      if (resp.ok) {
        const cands: CandidateData[] = await resp.json();
        setCandidates(cands);
        return cands;
      }
    } catch (err: any) {
      console.error('후보 로드 실패:', err);
    }
    return [];
  };

  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${jobId}`);
        if (!resp.ok) return;

        const job: MovieDramaJob = await resp.json();
        setCurrentJob(job);

        if (job.status === 'completed') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          await loadCandidates(jobId);
          setActiveStep('results');
          toast({
            title: '🎬 영화·드라마 쇼츠 분석 완료',
            description: `이야기 후보 ${job.settings?.targetShortsCount || 3}편이 준비되었습니다.`
          });
        } else if (job.status === 'failed' || job.status === 'canceled') {
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch (_) {
        // network retry
      }
    }, 1500);
  };

  const handleSelectVideoPath = (canonicalPath: string, fileName?: string) => {
    setCurrentJob(null);
    setCandidates([]);
    setSelectedVideoPath(canonicalPath);
    const resolvedName = fileName || canonicalPath.split(/[\\/]/).pop() || '선택된 영상';
    setSelectedVideoName(resolvedName);
    setErrorMessage(null);
    setVideoInfo({
      duration: 120.0
    });
    toast({
      title: '영상 파일 등록',
      description: `'${resolvedName}' 파일이 로컬 작업 저장소에 바인딩되었습니다.`
    });
  };

  const handleSelectVideoFile = async (file: File) => {
    // 새 영상 선택 시 이전 작업과의 결속을 즉시 해제
    setCurrentJob(null);
    setCandidates([]);
    setSelectedVideoName(file.name);
    setErrorMessage(null);

    // Electron 환경에서 실제 유효한 로컬 파일 경로가 있는 경우 바로 바인딩
    const electronApi = (window as any).electronAPI;
    const localPath = electronApi?.getPathForFile?.(file) || (file as any).path;
    if (localPath && typeof localPath === 'string' && !localPath.includes('fakepath')) {
      setSelectedVideoPath(localPath);
      setVideoInfo({
        size: file.size,
        duration: 120.0
      });
      toast({
        title: '영상 파일 등록',
        description: `'${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) 파일이 로드되었습니다.`
      });
      return;
    }

    // 일반 웹/브라우저 환경인 경우 서버 01_Inbox로 실제 업로드
    setIsUploadingSource(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/ve/movie-drama-shorts/upload-source', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: '업로드 실패' }));
        throw new Error(err.detail || '파일 업로드에 실패했습니다.');
      }
      const res = await resp.json();
      setSelectedVideoPath(res.canonicalPath);
      if (res.media) {
        setVideoInfo(res.media);
      } else {
        setVideoInfo({ size: res.size, duration: res.duration || 120.0 });
      }
      toast({
        title: '영상 업로드 완료',
        description: `'${res.filename}' (${(res.size / (1024 * 1024)).toFixed(1)}MB) 파일이 작업 저장소에 안전하게 등록되었습니다.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '영상 등록 실패', description: err.message });
      setErrorMessage({ title: '영상 업로드 실패', message: err.message });
    } finally {
      setIsUploadingSource(false);
    }
  };

  const handleStartAnalysis = () => {
    const videoPathToUse = selectedVideoPath || currentJob?.source?.canonicalPath;
    if (!videoPathToUse) {
      toast({ variant: 'destructive', title: '영상 필요', description: '먼저 원본 영상을 선택해주세요.' });
      return;
    }
    if (!selectedVideoPath && currentJob?.source?.canonicalPath) {
      setSelectedVideoPath(currentJob.source.canonicalPath);
      setSelectedVideoName(currentJob.source.originalName || '선택된 영상');
      if (currentJob.source.media) {
        setVideoInfo(currentJob.source.media);
      }
    }
    // 발주 전 확인 모달 열기
    setConfirmModalOpen(true);
  };

  const executeStartAnalysis = async () => {
    const videoPathToUse = selectedVideoPath || currentJob?.source?.canonicalPath;
    if (!videoPathToUse) return;
    setConfirmModalOpen(false);
    setIsStarting(true);
    setErrorMessage(null);

    try {
      const resp = await fetch('/api/ve/movie-drama-shorts/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoPathToUse,
          targetShortsCount: settings.targetShortsCount,
          deliveryMode: settings.deliveryMode,
          layoutPreset: settings.layoutPreset,
          seriesMode: settings.seriesMode,
          rightsConfirmed,
          styleSettings: {
            voiceId: settings.voiceId,
            ...settings.styleSettings
          }
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ detail: '작업 생성 실패' }));
        throw new Error(errData.detail || '작업 생성에 실패했습니다.');
      }

      const job: MovieDramaJob = await resp.json();
      setCurrentJob(job);
      setActiveStep('analysis');
      startPolling(job.id);

      toast({
        title: '🎬 씬 컷 감지 및 서사 분석 시작',
        description: 'FFmpeg 씬 체인지 및 Faster-Whisper 분석 파이프라인이 가동되었습니다.'
      });
    } catch (err: any) {
      setErrorMessage({
        title: '작업 시작 실패',
        message: err.message || '서버와의 통신에 실패했습니다.'
      });
      toast({ variant: 'destructive', title: '분석 시작 오류', description: err.message });
    } finally {
      setIsStarting(false);
    }
  };

  const handleInstallPortablePack = async (file: File) => {
    setIsInstallingPack(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/ve/movie-drama-shorts/install-portable-pack', {
        method: 'POST',
        body: formData
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: '설치 실패' }));
        throw new Error(err.detail || '이동 패키지 압축 해제 및 설치에 실패했습니다.');
      }
      const res = await resp.json();
      const newDraft = {
        candidateId: `pack-${Date.now()}`,
        draftPath: res.draftPath,
        title: res.projectName || file.name.replace(/\.zip$/i, '')
      };
      setLocalDrafts(prev => [newDraft, ...prev]);
      toast({
        title: '이동 패키지 설치 완료',
        description: `CapCut 프로젝트에 정상 등록되었습니다. (${newDraft.title})`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '패키지 설치 오류', description: err.message });
    } finally {
      setIsInstallingPack(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await fetch('/api/ve/movie-drama-shorts/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });
      if (pollingRef.current) clearInterval(pollingRef.current);
      toast({ title: '작업 취소', description: '분석 작업이 중단되었습니다.' });
      setActiveStep('setup');
    } catch (err: any) {
      toast({ variant: 'destructive', title: '취소 실패', description: err.message });
    }
  };

  const handleRenderMp4 = async (candidateId: string) => {
    if (!currentJob) return;
    setRenderingCandidateId(candidateId);
    try {
      const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${currentJob.id}/candidates/${candidateId}/render`, {
        method: 'POST'
      });
      if (!resp.ok) throw new Error('MP4 렌더링에 실패했습니다.');
      const res = await resp.json();
      setCompletedMp4Map(prev => ({ ...prev, [candidateId]: res.savedPath }));
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, savedMp4Path: res.savedPath } : c));
      toast({
        title: '🎬 9:16 완성 MP4 렌더링 완료',
        description: `05_Exports 폴더에 비디오가 성공적으로 저장되었습니다.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '렌더링 실패', description: err.message });
    } finally {
      setRenderingCandidateId(null);
    }
  };

  const handleRenderAllMp4 = async () => {
    if (!currentJob || candidates.length === 0) return;
    setIsBatchRendering(true);
    let successCount = 0;
    try {
      for (const cand of candidates) {
        try {
          const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${currentJob.id}/candidates/${cand.id}/render`, {
            method: 'POST'
          });
          if (resp.ok) {
            const res = await resp.json();
            setCompletedMp4Map(prev => ({ ...prev, [cand.id]: res.savedPath }));
            setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, savedMp4Path: res.savedPath } : c));
            successCount += 1;
          }
        } catch (_) {}
      }
      toast({
        title: '전체 MP4 렌더링 완료',
        description: `총 ${successCount}/${candidates.length}개의 쇼츠 MP4가 완성되었습니다.`
      });
    } finally {
      setIsBatchRendering(false);
    }
  };

  const handleExportCapcut = async (candidateId: string) => {
    if (!currentJob) return;
    setExportingCandidateId(candidateId);
    try {
      const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${currentJob.id}/candidates/${candidateId}/capcut`, {
        method: 'POST'
      });
      if (!resp.ok) throw new Error('CapCut 초안 생성 실패');
      const res = await resp.json();
      const cand = candidates.find(c => c.id === candidateId);
      setLocalDrafts(prev => [
        ...prev.filter(d => d.candidateId !== candidateId),
        { candidateId, draftPath: res.draftPath, title: cand?.title || 'CapCut 프로젝트' }
      ]);
      toast({
        title: 'CapCut 초안 생성 완료',
        description: `CapCut 4대 레이어 프로젝트가 준비되었습니다.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'CapCut 내보내기 오류', description: err.message });
    } finally {
      setExportingCandidateId(null);
    }
  };

  const handleExportAllCapcut = async () => {
    if (!currentJob || candidates.length === 0) return;
    setIsBatchExportingCapcut(true);
    try {
      for (const cand of candidates) {
        await handleExportCapcut(cand.id);
      }
    } finally {
      setIsBatchExportingCapcut(false);
    }
  };

  const handleCreatePortablePack = async (candidateId: string) => {
    if (!currentJob) return;
    setPackingCandidateId(candidateId);
    try {
      const resp = await fetch(`/api/ve/movie-drama-shorts/jobs/${currentJob.id}/candidates/${candidateId}/portable-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!resp.ok) throw new Error('이동 패키지 생성 실패');
      const res = await resp.json();
      toast({
        title: '이동 패키지 (ZIP) 생성 완료',
        description: `다른 PC로 이동할 수 있는 패키지가 생성되었습니다.`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '패키징 실패', description: err.message });
    } finally {
      setPackingCandidateId(null);
    }
  };

  const handleSaveFraming = async (newFraming: FramingCut[]) => {
    if (!currentJob || !activeFramingCandidate) return;
    setIsSavingFraming(true);
    try {
      const resp = await fetch(
        `/api/ve/movie-drama-shorts/jobs/${currentJob.id}/candidates/${activeFramingCandidate.id}/framing`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ framing: newFraming })
        }
      );
      if (!resp.ok) throw new Error('프레이밍 저장 실패');
      setCandidates(prev =>
        prev.map(c =>
          c.id === activeFramingCandidate.id
            ? { ...c, qualityBreakdown: { ...c.qualityBreakdown, framing: newFraming as any } }
            : c
        )
      );
      toast({ title: '화면 조정 저장', description: '9:16 인물 중심 프레이밍이 저장되었습니다.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '저장 실패', description: err.message });
    } finally {
      setIsSavingFraming(false);
    }
  };

  const handleRevealFolder = (path: string) => {
    toast({
      title: '폴더 위치 확인',
      description: path
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. 상단 글로벌 헤더 (Story Studio) - 라이트/다크 완벽 반응형 */}
      <header className="relative overflow-hidden rounded-2xl bg-card px-5 py-4 text-card-foreground shadow-xs border border-border">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Film className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-xs text-foreground">STORY STUDIO</span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium">
                  영화·드라마 쇼츠
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xl">
                {currentJob?.source?.originalName || '내 작품을 3~5부작 킬러 쇼츠 시리즈로 완성하세요'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentJob && (
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-bold border border-emerald-500/20">
                작업 저장됨
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartNewJob}
              className="h-8 rounded-lg border-border bg-background hover:bg-muted text-foreground text-xs font-bold gap-1 cursor-pointer shadow-xs"
            >
              <RotateCcw className="size-3" />
              <span>새 작업</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 에러 안내 배너 */}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.08] p-3 text-xs flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{errorMessage.title}</p>
              <p className="mt-0.5 text-muted-foreground">{errorMessage.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. 3-Step 워크스페이스 상단 네비게이션 (Po) */}
      <nav className="mx-auto flex w-full max-w-xl items-center gap-1 rounded-2xl bg-card border border-border p-1.5 shadow-xs">
        {[
          { id: 'setup', step: '01', label: '원본·설정' },
          { id: 'analysis', step: '02', label: '작품 분석' },
          { id: 'results', step: '03', label: '결과 확인' }
        ].map(st => {
          const isActive = activeStep === st.id;
          const isDisabled = (st.id === 'results' && candidates.length === 0 && !currentJob) ||
                             (st.id === 'analysis' && !currentJob);
          return (
            <button
              key={st.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveStep(st.id as any)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className={cn("text-[10px] font-mono", isActive ? "opacity-90" : "opacity-60")}>{st.step}</span>
              <span>{st.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. 단계별 뷰 마운트 */}
      <main className="min-h-[500px]">
        {activeStep === 'setup' && (
          <MovieDramaSetupSection
            selectedVideoPath={selectedVideoPath}
            selectedVideoName={selectedVideoName}
            videoInfo={videoInfo}
            onSelectVideoFile={handleSelectVideoFile}
            onSelectVideoPath={handleSelectVideoPath}
            settings={settings}
            onSettingsChange={patch => setSettings(prev => ({ ...prev, ...patch }))}
            rightsConfirmed={rightsConfirmed}
            onRightsConfirmedChange={setRightsConfirmed}
            isStarting={isStarting}
            onStartAnalysis={handleStartAnalysis}
            existingJob={currentJob}
            onStartNewJob={handleStartNewJob}
            isUploadingSource={isUploadingSource}
          />
        )}

        {activeStep === 'analysis' && currentJob && (
          <MovieDramaAnalysisSection
            job={currentJob}
            onCancelJob={handleCancelJob}
            onRetry={handleStartAnalysis}
            onStartNewJob={handleStartNewJob}
          />
        )}

        {activeStep === 'results' && (
          <MovieDramaResultsSection
            candidates={candidates}
            onRenderMp4={handleRenderMp4}
            renderingCandidateId={renderingCandidateId}
            onRenderAllMp4={handleRenderAllMp4}
            isBatchRendering={isBatchRendering}
            onOpenFramingModal={cand => {
              setActiveFramingCandidate(cand);
              setFramingModalOpen(true);
            }}
            onExportCapcut={handleExportCapcut}
            onExportAllCapcut={handleExportAllCapcut}
            exportingCandidateId={exportingCandidateId}
            isBatchExportingCapcut={isBatchExportingCapcut}
            onCreatePortablePack={handleCreatePortablePack}
            packingCandidateId={packingCandidateId}
            onInstallPortablePack={handleInstallPortablePack}
            isInstallingPack={isInstallingPack}
            localDrafts={localDrafts}
            completedMp4Map={completedMp4Map}
            onRevealFolder={handleRevealFolder}
          />
        )}
      </main>

      {/* 4. 프레이밍 조정 모달 (R6) */}
      {activeFramingCandidate && (
        <MovieDramaFramingModal
          open={framingModalOpen}
          onOpenChange={setFramingModalOpen}
          candidateTitle={activeFramingCandidate.title}
          sourceCuts={activeFramingCandidate.sourceCuts}
          currentFraming={activeFramingCandidate.qualityBreakdown?.framing || []}
          onSaveFraming={handleSaveFraming}
          isSaving={isSavingFraming}
        />
      )}

      {/* 5. 분석 시작 전 최종 확인 모달 (픽셀링 Fo 사전 점검 실체화) */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clapperboard className="size-4" />
              </span>
              <span className="text-xs font-bold text-primary">스튜디오 분석 시작 전 확인</span>
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {settings.targetShortsCount}부작 쇼츠 기획을 시작할까요?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              선택한 영상의 장면을 감지하고 AI가 가장 흡입력 높은 서사 구간을 설계합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-2 rounded-xl bg-muted/30 p-3.5 border border-border/70 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">대상 파일</span>
              <span className="font-bold text-foreground truncate max-w-[200px]" title={selectedVideoName || ''}>
                {selectedVideoName || '선택된 영상'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">제작 편수</span>
              <span className="font-bold text-foreground">{settings.targetShortsCount}편 (완결형 시리즈)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">전달 모드</span>
              <span className="font-bold text-foreground">
                {settings.deliveryMode === 'full_tts'
                  ? '내레이션 중심'
                  : settings.deliveryMode === 'clean_dialogue'
                  ? '원본 대사 중심'
                  : '하이브리드'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-border/50">
              <span className="text-muted-foreground font-medium">화면 구도</span>
              <span className="font-bold text-foreground">
                {settings.layoutPreset === 'full_bleed' ? '9:16 인물 중심 꽉 찬 화면' : '16:9 레터박스 원본 유지'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground font-medium">AI 목소리</span>
              <span className="font-bold text-primary">{settings.voiceId}</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="h-9 rounded-xl text-xs font-bold"
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={isStarting}
              onClick={executeStartAnalysis}
              className="h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs cursor-pointer"
            >
              {isStarting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>분석 파이프라인 가동 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>지금 바로 분석 시작</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
