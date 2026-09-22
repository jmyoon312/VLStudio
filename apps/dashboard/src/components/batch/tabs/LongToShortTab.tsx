import React, { useState } from 'react';
import {
  Scissors,
  Sparkles,
  Layers,
  Activity,
  Play,
  CheckCircle2,
  Download,
  Share2,
  Film,
  RefreshCw,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Types & API
import {
  HighlightCandidate,
  VideoProbeResult,
  ExtractionSettings,
  ProgressState
} from '@/types/longToShort';
import { longToShortApi } from '@/services/longToShortApi';

// Subcomponents
import { LongToShortSourceInput } from '../long_to_short/LongToShortSourceInput';
import { LongToShortPresetOptions } from '../long_to_short/LongToShortPresetOptions';
import { LongToShortProgressTracker } from '../long_to_short/LongToShortProgressTracker';
import { LongToShortCandidateCard } from '../long_to_short/LongToShortCandidateCard';
import { LongToShortOverlapModal } from '../long_to_short/LongToShortOverlapModal';
import { VideoPreviewModal } from '@/components/shared/VideoPreviewModal';

interface LongToShortTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const LongToShortTab: React.FC<LongToShortTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 1. 비디오 원본 및 프로빙 상태
  const [probeData, setProbeData] = useState<VideoProbeResult | null>(null);

  // 2. 추출 설정 파라미터 (픽셀링 extractionSettings SSOT)
  const [settings, setSettings] = useState<ExtractionSettings>({
    length_preset: 'medium',
    target_duration_sec: 45,
    candidate_count: 3,
    allow_overlap: false,
    silence_removal: true,
    silence_threshold_sec: 0.6,
    directives: '',
    multi_use_langs: ['ko']
  });

  // 3. 분석 진행 상태 (5단계)
  const [progress, setProgress] = useState<ProgressState>({
    stage: 'idle',
    percent: 0,
    message: ''
  });

  // 4. 감지된 킬러 하이라이트 후보군 목록
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([]);

  // 5. 모달 및 프리뷰 제어 상태
  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState<boolean>(false);
  const [previewCandidate, setPreviewCandidate] = useState<HighlightCandidate | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const isBusy = progress.stage !== 'idle' && progress.stage !== 'completed' && progress.stage !== 'failed';

  // 소스 프로빙 완료 콜백
  const handleProbeComplete = (data: VideoProbeResult) => {
    setProbeData(data);
    setSettings(prev => ({
      ...prev,
      candidate_count: data.recommended_candidates
    }));
  };

  // 소스 초기화
  const handleClearSource = () => {
    setProbeData(null);
    setCandidates([]);
    setProgress({ stage: 'idle', percent: 0, message: '' });
  };

  // VMI 하이라이트 분석 파이프라인 가동
  const handleRunVmiAnalysis = async () => {
    if (!probeData?.video_path) {
      toast({
        variant: 'destructive',
        title: '비디오 등록 필요',
        description: '분석할 로컬 영상 파일을 선택하거나 유튜브 URL을 다운로드하세요.'
      });
      return;
    }

    // 1단계: 준비 시작
    setProgress({
      stage: 'probing',
      percent: 15,
      message: '1. 비디오 파일 검증 및 오디오 스트림 분리 중...',
      detail: probeData.file_name
    });

    try {
      // 2단계: 음성 전사 가상 프로그레스
      setTimeout(() => {
        setProgress({
          stage: 'transcribing',
          percent: 40,
          message: '2. Faster-Whisper GPU 음성 인식 및 전사 중...',
          detail: '긴 영상의 음성을 나눠 분석 중입니다. 1/3 구간 처리됨.'
        });
      }, 800);

      // 3단계: 씬 전환 및 에너지 분석
      setTimeout(() => {
        setProgress({
          stage: 'analyzing',
          percent: 70,
          message: '3. FFmpeg 씬 전환(컷) 감지 및 RMS 데시벨 피크 분석 중...',
          detail: '컷 안의 장면 전환 감지 중...'
        });
      }, 1800);

      // 백엔드 실제 VMI 분석 API 호출
      const res = await longToShortApi.analyzeHighlights({
        video_path: probeData.video_path,
        length_preset: settings.length_preset,
        target_duration_sec: settings.target_duration_sec,
        candidate_count: settings.candidate_count,
        allow_overlap: settings.allow_overlap,
        silence_removal: settings.silence_removal,
        silence_threshold_sec: settings.silence_threshold_sec,
        directives: settings.directives,
        multi_use_langs: settings.multi_use_langs
      });

      // 4단계: 후보 구성 완료
      setProgress({
        stage: 'generating',
        percent: 95,
        message: '4. VMI 3중 텐서 복합 점수 산출 및 킬러 쇼츠 후보 구성 중...',
        detail: `총 ${res.candidates.length}개의 킬러 구간 선별 완료`
      });

      await new Promise(r => setTimeout(r, 400));

      setCandidates(res.candidates);
      setProgress({
        stage: 'completed',
        percent: 100,
        message: '✅ 킬러 쇼츠 하이라이트 분석 완료!',
        detail: `총 ${res.candidates.length}개의 킬러 구간이 추출되었습니다.`
      });

      toast({
        title: '🎉 VMI 킬러 쇼츠 분석 완료',
        description: `총 ${res.candidates.length}개의 하이라이트 구간을 성공적으로 추출했습니다.`
      });
    } catch (err: any) {
      console.error('Highlight analysis failed:', err);
      setProgress({
        stage: 'failed',
        percent: 0,
        message: '❌ 하이라이트 분석 실패',
        detail: err.message || '분석 중 오류가 발생했습니다.'
      });
      toast({
        variant: 'destructive',
        title: '분석 오류',
        description: err.message || '영상 분석에 실패했습니다. 다시 시도해 주세요.'
      });
    }
  };

  // 후보 선택 토글
  const handleToggleSelect = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  // 전체 선택 / 해제
  const handleToggleSelectAll = () => {
    const allSelected = candidates.every(c => c.selected);
    setCandidates(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  // 단일 클립 MP4 내보내기
  const handleExportSingleClip = async (candidate: HighlightCandidate) => {
    if (!probeData?.video_path) return;
    try {
      toast({ title: '✂️ MP4 클립 추출 중', description: `'${candidate.hook_summary}' 클립을 자르는 중입니다...` });
      const res = await longToShortApi.exportClip({
        video_path: probeData.video_path,
        candidate
      });
      toast({
        title: '✅ MP4 클립 저장 완료',
        description: `저장 경로: 05_Exports/Clips/${res.file_name}`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '클립 추출 실패', description: err.message });
    }
  };

  // 단일 CapCut 초안 내보내기
  const handleExportSingleCapCut = async (candidate: HighlightCandidate) => {
    if (!probeData?.video_path) return;
    try {
      toast({ title: '🎬 CapCut 초안 패키징 중', description: 'draft_content.json 프로젝트를 생성 중입니다...' });
      const res = await longToShortApi.exportCapCut({
        video_path: probeData.video_path,
        candidates: [candidate],
        project_title: `L2S_${candidate.id}`
      });
      toast({
        title: '✅ CapCut 초안 생성 완료',
        description: `프로젝트명: ${res.project_name}`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'CapCut 생성 실패', description: err.message });
    }
  };

  // 선택된 클립 전체 CapCut 일괄 내보내기
  const handleExportAllCapCut = async () => {
    const selected = candidates.filter(c => c.selected);
    if (selected.length === 0 || !probeData?.video_path) {
      toast({ variant: 'destructive', title: '후보를 선택하세요', description: '최소 1개 이상의 후보를 선택해야 합니다.' });
      return;
    }

    setIsExportingAll(true);
    try {
      const res = await longToShortApi.exportCapCut({
        video_path: probeData.video_path,
        candidates: selected,
        project_title: `L2S_일괄패키지_${Date.now()}`
      });
      toast({
        title: '🎉 CapCut 초안 일괄 내보내기 완료',
        description: `총 ${res.clips_count}개 클립이 포함된 초안 프로젝트가 생성되었습니다: ${res.project_name}`
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: '일괄 내보내기 실패', description: err.message });
    } finally {
      setIsExportingAll(false);
    }
  };

  // 일괄 작업 큐 등록 (BatchWorkQueueSection 직결)
  const handleQueueBatchJobs = () => {
    const selected = candidates.filter(c => c.selected);
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: '후보 선택 필요', description: '대기열에 등록할 숏폼을 최소 1개 이상 선택하세요.' });
      return;
    }

    const newJobs = selected.map((c, idx) => ({
      id: `l2s-v1-${Date.now()}-${idx}`,
      title: `[롱투숏] ${c.hook_summary}`,
      sourceType: 'video',
      archetype: 'classic',
      tabId: 'long-to-short',
      createdAt: new Date().toLocaleTimeString(),
      status: 'ready',
      scriptLinesCount: 4,
      videoPath: probeData?.video_path,
      metadata: {
        originalVideo: probeData?.file_name || '롱폼 원본',
        startSec: c.start_sec,
        endSec: c.end_sec,
        durationSec: c.duration_sec,
        vmiScore: c.vmi_score,
        hookScore: c.hook_score,
        storyScore: c.story_score,
        rhythmScore: c.rhythm_score,
        captionScore: c.caption_score,
        transcript: c.transcript,
        reason: c.reason,
        scenes: [
          { order: 1, narration: c.hook_summary, hookJabText: '*핵심 하이라이트*', startTime: 0 },
          { order: 2, narration: c.transcript ? c.transcript.slice(0, 50) : `구간 ${c.start_sec}초 ~ ${c.end_sec}초`, hookJabText: '*사이다 순간*', startTime: 3.5 }
        ]
      }
    }));

    onAddBatchJobs(newJobs);
    toast({
      title: '🚀 일괄 대기열 등록 완료',
      description: `총 ${newJobs.length}개의 킬러 쇼츠가 대량 제작 큐에 등록되었습니다.`
    });
  };

  const selectedCount = candidates.filter(c => c.selected).length;

  return (
    <div className="space-y-5">
      {/* 메인 3-ZONE 그리드 컨테이너 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 레일 (lg:col-span-5): 비디오 소스 인입 & 픽셀링 4대 프리셋 옵션 */}
        <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs">
          {/* 소스 인입부 */}
          <LongToShortSourceInput
            probeData={probeData}
            onProbeComplete={handleProbeComplete}
            onClearSource={handleClearSource}
            disabled={isBusy}
          />

          {/* 픽셀링 4대 프리셋 및 스마트 파라미터 인스펙터 */}
          <LongToShortPresetOptions
            settings={settings}
            onChange={setSettings}
            probeData={probeData}
            onRequestOverlapConsent={() => setIsOverlapModalOpen(true)}
            disabled={isBusy}
          />

          {/* 분석 시작 버튼 */}
          <Button
            type="button"
            disabled={isBusy || !probeData}
            onClick={handleRunVmiAnalysis}
            className="w-full h-11 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition cursor-pointer"
          >
            <Activity className={cn("w-4 h-4", isBusy && "animate-spin")} />
            <span>{isBusy ? 'VMI 하이라이트 정밀 분석 중...' : '오디오·비전 VMI 킬러 구간 분석 시작'}</span>
          </Button>
        </div>

        {/* 우측 레일 (lg:col-span-7): 진행 상태 트래커 및 후보군 카드 리스트 */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            {/* 상단 헤더 및 전체 선택 바 */}
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  감지된 킬러 쇼츠 후보군 (VMI Candidates)
                </span>
              </div>

              {candidates.length > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-muted-foreground hover:text-foreground transition cursor-pointer text-[11px] font-bold"
                  >
                    {candidates.every(c => c.selected) ? '전체 해제' : '전체 선택'}
                  </button>
                  <span className="text-muted-foreground text-[11px]">
                    선택됨: <strong className="text-primary">{selectedCount}</strong> / {candidates.length}개
                  </span>
                </div>
              )}
            </div>

            {/* 실시간 5단계 진행 트래커 */}
            <LongToShortProgressTracker progress={progress} />

            {/* 후보군 카드 목록 스크롤 뷰 */}
            {candidates.length > 0 ? (
              <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {candidates.map((cand, idx) => (
                  <LongToShortCandidateCard
                    key={cand.id}
                    candidate={cand}
                    index={idx}
                    onToggleSelect={handleToggleSelect}
                    onPreview={c => setPreviewCandidate(c)}
                    onExportClip={handleExportSingleClip}
                    onExportCapCut={handleExportSingleCapCut}
                    disabled={isBusy}
                  />
                ))}
              </div>
            ) : (
              /* 후보군 미생성 상태 안내 */
              !isBusy && (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-2">
                  <Scissors className="w-8 h-8 text-muted-foreground/40" />
                  <span className="text-xs font-bold text-muted-foreground">
                    추출된 하이라이트 후보가 없습니다
                  </span>
                  <p className="text-[11px] text-muted-foreground/80 max-w-xs leading-relaxed">
                    좌측에서 롱폼 비디오를 등록하고 [VMI 킬러 구간 분석 시작]을 누르면 알고리즘이 35~60초 완결형 숏폼 후보를 선별합니다.
                  </p>
                </div>
              )
            )}
          </div>

          {/* 하단 고정 일괄 액션 바 */}
          {candidates.length > 0 && (
            <div className="pt-3 border-t border-border flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isBusy || selectedCount === 0 || isExportingAll}
                  onClick={handleExportAllCapCut}
                  className="h-9 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>선택 {selectedCount}개 CapCut 초안 일괄 내보내기</span>
                </Button>
              </div>

              <Button
                type="button"
                disabled={isBusy || selectedCount === 0}
                onClick={handleQueueBatchJobs}
                className="h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>선택한 {selectedCount}개 일괄 대기열 등록</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 중복 허용 모달 */}
      <LongToShortOverlapModal
        isOpen={isOverlapModalOpen}
        maxCandidates={probeData?.max_candidates || 10}
        requestedCount={settings.candidate_count}
        onConfirm={() => {
          setSettings(prev => ({ ...prev, allow_overlap: true }));
          setIsOverlapModalOpen(false);
          toast({
            title: '구간 중복 허용 활성화',
            description: `${settings.candidate_count}개의 쇼츠 후보를 최대한 추출합니다.`
          });
        }}
        onCancel={() => {
          setSettings(prev => ({
            ...prev,
            candidate_count: probeData?.max_candidates || 10,
            allow_overlap: false
          }));
          setIsOverlapModalOpen(false);
        }}
      />

      {/* 비디오 프리뷰 모달 */}
      {previewCandidate && (
        <VideoPreviewModal
          isOpen={!!previewCandidate}
          onClose={() => setPreviewCandidate(null)}
          videoTitle={previewCandidate.hook_summary}
          videoUrl={probeData?.video_path}
          sourceType="video"
          jobId={previewCandidate.id}
          initialSubtitles={
            previewCandidate.transcript
              ? [{ id: 'sub-1', start: previewCandidate.start_sec, end: previewCandidate.end_sec, text: previewCandidate.transcript }]
              : []
          }
        />
      )}
    </div>
  );
};
