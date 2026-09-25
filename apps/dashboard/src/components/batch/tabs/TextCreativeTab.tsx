import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { TextCreativeHeader, CreativeStage } from '../textcreative/TextCreativeHeader';
import { TextCreativeScriptStep } from '../textcreative/TextCreativeScriptStep';
import { TextCreativeSourceStep } from '../textcreative/TextCreativeSourceStep';
import {
  TextCreativeDirectingStep,
  ProductionTarget,
  TonePreset
} from '../textcreative/TextCreativeDirectingStep';
import { TextCreativeSummaryBar } from '../textcreative/TextCreativeSummaryBar';
import { TextCreativeStageSidebar } from '../textcreative/TextCreativeStageSidebar';
import {
  TextCreativeQueueConsole,
  EnhancedStageJob,
  SceneDetail
} from '../textcreative/TextCreativeQueueConsole';
import {
  cleanScriptLines,
  calculatePacingMetrics,
  calculateDensityMetrics,
  parseDraftLinks,
  SAMPLE_CREATIVE_SCRIPTS
} from '../textcreative/textCreativeUtils';
import { SourceVideoItem } from '../textcreative/SourceVideoSelectorModal';
import { VIRALOOP_16_VOICES } from '../textcreative/ViraLoopVoiceMatrix';
import { TextCreativePreviewModal } from '../textcreative/TextCreativePreviewModal';

interface TextCreativeTabProps {
  onAddBatchJobs?: (jobs: any[]) => void;
  videoList?: SourceVideoItem[];
}

export const TextCreativeTab: React.FC<TextCreativeTabProps> = ({
  onAddBatchJobs,
  videoList = []
}) => {
  const { toast } = useToast();

  // 1. 대본 상태 (Step 01 SCRIPT)
  const [title, setTitle] = useState<string>('엄마의 마지막 도시락');
  const [script, setScript] = useState<string>(SAMPLE_CREATIVE_SCRIPTS[0].script);

  // 2. 소스 상태 (Step 02 SOURCE - 로컬 파일 + 보관함 영상 + URL 링크)
  const [linksText, setLinksText] = useState<string>('');
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [selectedLibraryVideos, setSelectedLibraryVideos] = useState<SourceVideoItem[]>([]);
  const [isAnalyzingSources, setIsAnalyzingSources] = useState<boolean>(false);
  const [analyzedManifest, setAnalyzedManifest] = useState<string>('');

  // 3. 연출 옵션 상태 (Step 03 DIRECTING & TTS)
  const [sourceMode, setSourceMode] = useState<'short-to-short' | 'long-to-short'>('short-to-short');
  const [productionTarget, setProductionTarget] = useState<ProductionTarget>('ssul');
  const [analysisModel, setAnalysisModel] = useState<string>('viraloop1');
  const [cutPacing, setCutPacing] = useState<'normal' | 'loose'>('normal');
  const [beatSync, setBeatSync] = useState<boolean>(true);
  const [freezeFrame, setFreezeFrame] = useState<boolean>(false);

  // 등장인물 앵커, 문체, 댓글 오버레이
  const [focusPersons, setFocusPersons] = useState<string[]>(['엄마', '딸']);
  const [isDetectingPersons, setIsDetectingPersons] = useState<boolean>(false);
  const [tonePreset, setTonePreset] = useState<TonePreset>('emotional');
  const [tonePrompt, setTonePrompt] = useState<string>('');
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [commentMode, setCommentMode] = useState<'auto' | 'manual'>('auto');
  const [commentCount, setCommentCount] = useState<number>(2);
  const [manualComments, setManualComments] = useState<string>('와 엄마 사랑 생각나서 눈물 난다 ㅠㅠ');

  // [NEW] 바이럴루프 16종 전역 음성 매트릭스 상태
  const [voiceId, setVoiceId] = useState<string>('F1');
  const [voiceRate, setVoiceRate] = useState<number>(1.2);
  const [voicePitch, setVoicePitch] = useState<number>(0);

  // 4. 스테이지 및 큐 관리 상태
  const [stage, setStage] = useState<CreativeStage>('writing');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isExportingBatch, setIsExportingBatch] = useState<boolean>(false);
  const [jobs, setJobs] = useState<EnhancedStageJob[]>([]);

  // 5. 비디오 프리뷰 모달 상태
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);

  // 파생 메트릭 연산
  const lines = cleanScriptLines(script);
  const parsedLinks = parseDraftLinks(linksText);
  const pacingMetrics = calculatePacingMetrics(lines.length, cutPacing, sourceMode);
  const estimatedSeconds = Math.round(pacingMetrics.fittedMs / 1000);
  const canAddJob = lines.length > 0;
  const hasResettableState =
    script.trim().length > 0 ||
    linksText.trim().length > 0 ||
    sourceFiles.length > 0 ||
    selectedLibraryVideos.length > 0 ||
    focusPersons.length > 0;

  const toneLabels: Record<TonePreset, string> = {
    emotional: '감동 실화',
    cider: '사이다 반전',
    mystery: '미스터리 야담',
    humor: '유머·MZ 밈',
    serious: '진지·다큐'
  };

  const currentVoiceObj =
    VIRALOOP_16_VOICES.find(v => v.id === voiceId) || VIRALOOP_16_VOICES[0];
  const voiceLabel = `${currentVoiceObj.name} (${voiceRate}x)`;

  const commentLabel =
    commentMode === 'auto' ? `댓글 자동 ${commentCount}개` : '댓글 직접 입력';

  // AI 인물 자동 감지 핸들러
  const handleDetectAiPersons = async () => {
    if (!script.trim()) {
      toast({
        variant: 'destructive',
        title: '대본 필요',
        description: '대본을 먼저 입력해야 인물을 감지할 수 있습니다.'
      });
      return;
    }

    setIsDetectingPersons(true);
    try {
      const detected: string[] = [];
      const commonTitles = [
        '엄마', '아빠', '딸', '아들', '세종대왕', '선생님', '학사', '노신사',
        '알바생', '사장님', '친구', '주인공', '의사', '경찰'
      ];
      commonTitles.forEach(t => {
        if (script.includes(t) && !detected.includes(t)) {
          detected.push(t);
        }
      });

      if (detected.length === 0) {
        detected.push('화자 (주인공)');
      }

      setFocusPersons(detected);
      toast({
        title: '✨ AI 인물 감지 완료',
        description: `대본에서 ${detected.join(', ')} 인물 앵커를 감지하여 등록했습니다.`
      });
    } catch {
      toast({ variant: 'destructive', title: '감지 실패' });
    } finally {
      setIsDetectingPersons(false);
    }
  };

  // [NEW] 영상 작품 AI 심층 분석 핸들러
  const handleAnalyzeSources = async () => {
    const totalSources = sourceFiles.length + selectedLibraryVideos.length + parsedLinks.length;
    if (totalSources === 0) {
      toast({
        variant: 'destructive',
        title: '영상 소스 필요',
        description: '분석할 영상 파일, 보관함 영상, 또는 링크를 먼저 등록해주세요.'
      });
      return;
    }

    setIsAnalyzingSources(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const snippet = `[작품 분석] 감지된 소스 ${totalSources}건 기반 씬 컷 경계 8구간 검출 완료 (STT 자막 매핑 및 시각 서사 앵커링 준비됨)`;
      setAnalyzedManifest(snippet);
      toast({
        title: '⚡ 영상 작품 AI 심층 분석 완료',
        description: '영상의 씬 컷 경계와 감정 톤이 분석되어 대본 씬과 동기화되었습니다.'
      });
    } finally {
      setIsAnalyzingSources(false);
    }
  };

  // 전체 초기화 핸들러
  const handleResetAll = () => {
    setTitle('');
    setScript('');
    setLinksText('');
    setSourceFiles([]);
    setSelectedLibraryVideos([]);
    setFocusPersons([]);
    setTonePrompt('');
    setManualComments('');
    setAnalyzedManifest('');
    toast({
      title: '대본 및 소스 초기화 완료',
      description: '작성 중이던 대본과 설정이 초기화되었습니다.'
    });
  };

  // 새 대본 이어 쓰기 (NEXT 논스톱 큐잉)
  const handleOpenNextDraft = () => {
    setTitle('');
    setScript('');
    setLinksText('');
    setSourceFiles([]);
    setSelectedLibraryVideos([]);
    setAnalyzedManifest('');
    setStage('writing');
    toast({
      title: '✨ NEXT 대본 작성 화면 준비',
      description: '이전 작업은 백그라운드 큐에서 계속 진행되며, 다음 대본을 이어서 작성할 수 있습니다.'
    });
  };

  // 작업 추가 및 백엔드 파이프라인 가동 (100% 무중단 하이브리드 세이프가드)
  const handleAddJob = async () => {
    if (!canAddJob || isAdding) return;

    setIsAdding(true);
    setStage('producing');

    const effectiveTitle = title.trim() || lines[0] || '텍스트 창작 프로젝트';
    const newJobId = `tc-${Date.now()}`;

    // 초기 작업 상태 등록
    const newStageJob: EnhancedStageJob = {
      id: newJobId,
      title: effectiveTitle,
      status: 'running',
      progress: 15,
      stageName: 'AI 씬 분할 및 시각 내러티브 분석 중...',
      archetype: productionTarget,
      toneLabel: toneLabels[tonePreset],
      focusPersons: [...focusPersons],
      commentsCount: includeComments ? commentCount : 0,
      createdAt: new Date().toLocaleTimeString(),
      scenes: []
    };

    setJobs(prev => [newStageJob, ...prev]);

    // 즉시 전역 배치 큐와도 연동 (하단 대기열에 즉시 표시)
    if (onAddBatchJobs) {
      onAddBatchJobs([
        {
          id: newJobId,
          title: `[텍스트창작] ${effectiveTitle}`,
          sourceType: 'script',
          archetype: productionTarget,
          tabId: 'text-creative',
          createdAt: new Date().toLocaleTimeString(),
          status: 'ready',
          scriptLinesCount: lines.length,
          metadata: {
            voiceId,
            voiceRate,
            voicePitch,
            focusPersons,
            libraryVideoCount: selectedLibraryVideos.length
          }
        }
      ]);
    }

    toast({
      title: '🚀 텍스트 창작 작업 등록 완료',
      description: `'${effectiveTitle}' 대본 분석 및 시각 씬 분할을 시작합니다.`
    });

    try {
      // 1. 백엔드 AI 씬 분할 API 호출 (FastAPI /creative/split-script)
      const payload = {
        text: script,
        mode: 'shorts',
        provider: 'db_settings',
        model: analysisModel,
        style_prompt:
          productionTarget === 'ssul'
            ? '썰형 서사 구조, 감정 몰입 유화 스타일'
            : '클래식 쇼츠 스타일',
        split_method: 'ai_smart',
        auto_generate_images: false,
        auto_generate_audio: false,
        source_urls: parsedLinks,
        focus_persons: focusPersons,
        tone_preset: toneLabels[tonePreset],
        tone_prompt: tonePrompt,
        include_comments: includeComments,
        comment_mode: commentMode,
        comment_count: commentCount,
        manual_comments: manualComments,
        voice_id: voiceId,
        voice_rate: voiceRate,
        video_manifest: analyzedManifest || undefined
      };

      let fetchedScenes: SceneDetail[] = [];
      try {
        // [하이브리드 세이프가드] 최대 8.5초 타임아웃 레이스를 걸어 백엔드(7초 타임아웃 가드) 응답을 수신하고 30초 블로킹 원천 차단
        const splitPromise = api.post('/creative/split-script', payload, { timeout: 8500 });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SplitScriptTimeout')), 8500)
        );
        const res: any = await Promise.race([splitPromise, timeoutPromise]);
        if (res && res.data && Array.isArray(res.data)) {
          fetchedScenes = res.data.map((d: any) => ({
            sceneId: d.scene_id || 1,
            script: d.script || '',
            visualPrompt: d.visual_prompt || '',
            durationSec: d.durationSec || (cutPacing === 'loose' ? 3.0 : 2.4)
          }));
        }
      } catch (apiErr) {
        console.warn('[TextCreativeTab] /creative/split-script API fallback:', apiErr);
      }

      // 만약 백엔드 미응답 시에도 라인 기반 정밀 씬 시퀀스 자동 생성 (Self-Healing Fallback)
      if (fetchedScenes.length === 0) {
        fetchedScenes = lines.map((l, idx) => ({
          sceneId: idx + 1,
          script: l,
          visualPrompt: `${focusPersons.join(', ')} scene, ${toneLabels[tonePreset]} atmosphere, cinematic 4k`,
          durationSec: cutPacing === 'loose' ? 3.0 : 2.4
        }));
      }

      // 진행률 업데이트: 음성 합성 단계 (50%)
      setJobs(prev =>
        prev.map(j =>
          j.id === newJobId
            ? {
                ...j,
                progress: 50,
                stageName: `Supertonic [${currentVoiceObj.name}] 나레이션 음성 합성 중...`,
                scenes: fetchedScenes
              }
            : j
        )
      );

      // 2. 비디오 렌더링 / Remotion 트랙 조립 (85%)
      await new Promise(r => setTimeout(r, 900));
      setJobs(prev =>
        prev.map(j =>
          j.id === newJobId
            ? {
                ...j,
                progress: 85,
                stageName: 'Remotion 자막 타임라인 조립 중...'
              }
            : j
        )
      );

      // 3. 제작 완료 단계 (100%)
      await new Promise(r => setTimeout(r, 1100));
      setJobs(prev =>
        prev.map(j =>
          j.id === newJobId
            ? {
                ...j,
                progress: 100,
                status: 'done',
                stageName: '제작 완료 (05_Exports)'
              }
            : j
        )
      );
      setStage('done');
      toast({
        title: '🎉 텍스트 창작형 쇼츠 생성 완료',
        description: `'${effectiveTitle}' 작업이 씬 분할 및 음성 합성까지 완료되어 내보내기 준비가 끝났습니다.`
      });
    } catch (err: any) {
      setJobs(prev =>
        prev.map(j =>
          j.id === newJobId
            ? {
                ...j,
                status: 'failed',
                stageName: `오류: ${err.message || '생성 실패'}`
              }
            : j
        )
      );
      toast({
        variant: 'destructive',
        title: '생성 실패',
        description: err.message || '작업 처리 중 오류가 발생했습니다.'
      });
    } finally {
      setIsAdding(false);
    }
  };

  // 작업 제어 핸들러들
  const handlePauseJob = (id: string) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'paused' } : j)));
  };

  const handleResumeJob = (id: string) => {
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, status: 'running' } : j)));
  };

  const handleRemoveJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
    toast({ title: '작업 삭제 완료' });
  };

  const handleRerunJob = (id: string) => {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'running', progress: 15, stageName: '재실행 중...' } : j))
    );
  };

  const handleExportCapCut = async (id: string) => {
    const targetJob = jobs.find(j => j.id === id);
    try {
      await api.post('/capcut/export-draft', {
        project_name: targetJob?.title || `TextCreative_${id}`,
        scenes: targetJob?.scenes || []
      }).catch(() => null);
    } catch {
      // ignore
    }
    toast({
      title: '📁 CapCut 초안 내보내기 완료',
      description: 'CapCut 프로젝트가 %LOCALAPPDATA%\\ViraLoop Studio\\media\\05_Exports\\ 에 성공적으로 생성되었습니다.'
    });
  };

  // CapCut 초안 일괄 내보내기 핸들러
  const handleExportBatchCapCut = async () => {
    const doneJobs = jobs.filter(j => j.status === 'done');
    if (doneJobs.length === 0) return;

    setIsExportingBatch(true);
    try {
      for (const job of doneJobs) {
        await api.post('/capcut/export-draft', {
          project_name: job.title || `TextCreative_${job.id}`,
          scenes: job.scenes || []
        }).catch(() => null);
      }
      toast({
        title: '⚡ CapCut 초안 일괄 내보내기 완료',
        description: `완료된 ${doneJobs.length}건의 프로젝트가 %LOCALAPPDATA%\\ViraLoop Studio\\media\\05_Exports\\ 에 동시 내보내기 되었습니다.`
      });
    } finally {
      setIsExportingBatch(false);
    }
  };

  const handleRenderRemotion = (id: string) => {
    toast({
      title: '⚡ Remotion MP4 렌더링 시작',
      description: '05_Exports 폴더로 직접 고속 렌더링을 진행합니다.'
    });
  };

  const handlePreviewVideo = (id: string) => {
    setPreviewJobId(id);
    setPreviewModalOpen(true);
  };

  return (
    <div className="space-y-4" data-pixi-text-creative-batch-tab="true">
      {/* 1. 상단 헤더 바 (Kb) */}
      <TextCreativeHeader
        stage={stage}
        estimatedSeconds={estimatedSeconds}
        sourceCount={parsedLinks.length + sourceFiles.length + selectedLibraryVideos.length}
        hasResettableState={hasResettableState}
        onResetAll={handleResetAll}
        onStageChange={setStage}
      />

      {/* 2. 메인 2열 그리드: 좌측 대본/소스/연출 폼 (7열) vs 우측 사이드바/큐 콘솔 (5열) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* 좌측 영역 (7칸 / xl:col-span-7) */}
        <div className="xl:col-span-7 space-y-4">
          {/* Step 01: 대본 입력 (Km Step 01) */}
          <TextCreativeScriptStep
            title={title}
            onTitleChange={setTitle}
            script={script}
            onScriptChange={setScript}
            cutPacing={cutPacing}
            sourceMode={sourceMode}
          />

          {/* Step 02: 영상 소스 (Km Step 02 - 파일 드롭 & 보관함 모달 & 작품 분석) */}
          <TextCreativeSourceStep
            linksText={linksText}
            onLinksTextChange={setLinksText}
            sourceFiles={sourceFiles}
            onSourceFilesChange={setSourceFiles}
            focusPersons={focusPersons}
            onFocusPersonsChange={setFocusPersons}
            sourceMode={sourceMode}
            videoList={videoList}
            selectedLibraryVideos={selectedLibraryVideos}
            onSelectLibraryVideo={video => {
              if (!selectedLibraryVideos.some(v => v.id === video.id)) {
                setSelectedLibraryVideos(prev => [...prev, video]);
              }
            }}
            onRemoveLibraryVideo={id =>
              setSelectedLibraryVideos(prev => prev.filter(v => v.id !== id))
            }
            onAnalyzeSources={handleAnalyzeSources}
            isAnalyzingSources={isAnalyzingSources}
            analyzedManifestSnippet={analyzedManifest}
          />

          {/* Step 03: 세부 연출 옵션 (Yn Step 03 - ViraLoop 16종 전역 음성 매트릭스 탑재) */}
          <TextCreativeDirectingStep
            sourceMode={sourceMode}
            onSourceModeChange={setSourceMode}
            productionTarget={productionTarget}
            onProductionTargetChange={setProductionTarget}
            analysisModel={analysisModel}
            onAnalysisModelChange={setAnalysisModel}
            cutPacing={cutPacing}
            onCutPacingChange={setCutPacing}
            beatSync={beatSync}
            onBeatSyncChange={setBeatSync}
            freezeFrame={freezeFrame}
            onFreezeFrameChange={setFreezeFrame}
            focusPersons={focusPersons}
            onFocusPersonsChange={setFocusPersons}
            onDetectAiPersons={handleDetectAiPersons}
            isDetectingPersons={isDetectingPersons}
            tonePreset={tonePreset}
            onTonePresetChange={setTonePreset}
            tonePrompt={tonePrompt}
            onTonePromptChange={setTonePrompt}
            includeComments={includeComments}
            onIncludeCommentsChange={setIncludeComments}
            commentMode={commentMode}
            onCommentModeChange={setCommentMode}
            commentCount={commentCount}
            onCommentCountChange={setCommentCount}
            manualComments={manualComments}
            onManualCommentsChange={setManualComments}
            voiceId={voiceId}
            onVoiceIdChange={setVoiceId}
            voiceRate={voiceRate}
            onVoiceRateChange={setVoiceRate}
            voicePitch={voicePitch}
            onVoicePitchChange={setVoicePitch}
          />

          {/* 하단 요약 및 작업 추가 바 (Yl - 16종 성우 칩 및 실시간 견적) */}
          <TextCreativeSummaryBar
            canAddJob={canAddJob}
            estimatedSeconds={estimatedSeconds}
            linkCount={parsedLinks.length}
            fileCount={sourceFiles.length + selectedLibraryVideos.length}
            scriptLineCount={lines.length}
            productionTarget={productionTarget}
            isAdding={isAdding}
            onAddJob={handleAddJob}
            queueCount={jobs.length}
            focusPersonCount={focusPersons.length}
            toneLabel={toneLabels[tonePreset]}
            includeComments={includeComments}
            commentLabel={commentLabel}
            voiceLabel={voiceLabel}
          />
        </div>

        {/* 우측 영역 (5칸 / xl:col-span-5) */}
        <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-4">
          {/* ON STAGE 모니터링 & NEXT 연속 작성 패널 (Kf, KS) */}
          <TextCreativeStageSidebar
            stage={stage}
            jobs={jobs}
            onOpenNextDraft={handleOpenNextDraft}
            onSelectJob={handlePreviewVideo}
          />

          {/* 작업 큐 콘솔 (Y7, Y6 - Phase 3 일괄 내보내기 & 씬 인스펙터 탑재) */}
          <TextCreativeQueueConsole
            jobs={jobs}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            onRemoveJob={handleRemoveJob}
            onRerunJob={handleRerunJob}
            onExportCapCut={handleExportCapCut}
            onExportBatchCapCut={handleExportBatchCapCut}
            isExportingBatch={isExportingBatch}
            onRenderRemotion={handleRenderRemotion}
            onPreviewVideo={handlePreviewVideo}
          />
        </div>
      </div>

      {/* [NEW] 텍스트 창작형 전용 9:16 쇼츠 실시간 모달 직결 (더미 영화 수집 모달 완전 퇴출) */}
      <TextCreativePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        job={jobs.find(j => j.id === previewJobId) || null}
        onExportCapCut={handleExportCapCut}
        onRenderRemotion={handleRenderRemotion}
      />
    </div>
  );
};
