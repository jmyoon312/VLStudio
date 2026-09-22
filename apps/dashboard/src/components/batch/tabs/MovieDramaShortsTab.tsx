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
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    voiceId: 'ko-KR-SunHiNeural',
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

  const fetchRecentJob = async () => {
    try {
      const resp = await fetch('/api/ve/movie-drama-shorts/jobs');
      if (resp.ok) {
        const jobs: MovieDramaJob[] = await resp.json();
        const active = jobs.find(j => j.status === 'processing') || jobs[0];
        if (active) {
          setCurrentJob(active);
          setSelectedVideoName(active.source?.originalName || null);
          if (active.source?.canonicalPath) {
            setSelectedVideoPath(active.source.canonicalPath);
          }
          if (active.source?.media) {
            setVideoInfo(active.source.media);
          }
          if (active.status === 'processing') {
            setActiveStep('analysis');
            startPolling(active.id);
          } else if (active.status === 'completed') {
            loadCandidates(active.id);
            setActiveStep('results');
          }
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
      }
    } catch (err: any) {
      console.error('후보 로드 실패:', err);
    }
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

  const handleSelectVideoFile = (file: File) => {
    // 브라우저 File 객체로부터 이름 및 크기 반영
    setSelectedVideoName(file.name);
    // Electron 또는 로컬 파일 시스템 경로가 있을 경우 주입
    const localPath = (file as any).path || file.name;
    setSelectedVideoPath(localPath);
    setVideoInfo({
      size: file.size,
      duration: 120.0
    });
    setErrorMessage(null);
    toast({
      title: '영상 파일 등록',
      description: `'${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) 파일이 로드되었습니다.`
    });
  };

  const handleStartAnalysis = async () => {
    if (!selectedVideoPath) {
      toast({ variant: 'destructive', title: '영상 필요', description: '먼저 원본 영상을 선택해주세요.' });
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const resp = await fetch('/api/ve/movie-drama-shorts/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: selectedVideoPath,
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
      {/* 1. 상단 글로벌 헤더 (Story Studio) */}
      <header className="relative overflow-hidden rounded-2xl bg-neutral-950 px-5 py-4 text-white shadow-xl border border-neutral-800">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-neutral-950 shadow-md">
              <Film className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-xs">STORY STUDIO</span>
                <Badge variant="secondary" className="text-[10px] bg-white/10 text-white border-0 font-medium">
                  영화·드라마 쇼츠
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-white/70">
                {currentJob?.source?.originalName || '내 작품을 3~5부작 킬러 쇼츠 시리즈로 완성하세요'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentJob && (
              <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-[11px] font-bold border border-emerald-500/30">
                작업 저장됨
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveStep('setup');
                setCurrentJob(null);
                setCandidates([]);
              }}
              className="h-8 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs font-bold gap-1"
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
            className="text-muted-foreground hover:text-foreground"
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
          const isDisabled = st.id === 'results' && candidates.length === 0 && !currentJob;
          return (
            <button
              key={st.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setActiveStep(st.id as any)}
              className={cn(
                "flex-1 py-2 px-3 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2",
                isActive
                  ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                isDisabled && "opacity-40 cursor-not-allowed"
              )}
            >
              <span className="text-[10px] font-mono opacity-60">{st.step}</span>
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
            onSelectVideoPath={setSelectedVideoPath}
            settings={settings}
            onSettingsChange={patch => setSettings(prev => ({ ...prev, ...patch }))}
            rightsConfirmed={rightsConfirmed}
            onRightsConfirmedChange={setRightsConfirmed}
            isStarting={isStarting}
            onStartAnalysis={handleStartAnalysis}
            existingJob={currentJob}
            onStartNewJob={() => {
              setCurrentJob(null);
              setCandidates([]);
            }}
          />
        )}

        {activeStep === 'analysis' && currentJob && (
          <MovieDramaAnalysisSection
            job={currentJob}
            onCancelJob={handleCancelJob}
            onRetry={handleStartAnalysis}
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
            onInstallPortablePack={() => {
              toast({ title: '이동 패키지 설치', description: '이동 패키지(ZIP) 가져오기 다이얼로그를 준비 중입니다.' });
            }}
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
    </div>
  );
};
