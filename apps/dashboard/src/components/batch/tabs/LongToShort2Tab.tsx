import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  Download,
  Share2,
  CheckCircle2,
  Layers,
  Clock,
  MessageSquare,
  Maximize2,
  Film,
  Camera,
  RotateCcw,
  HelpCircle,
  Zap,
  Flame,
  ArrowRight,
  FolderPlus,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Types
import { VideoProbeResult } from '@/types/longToShort';
import {
  LongToShort2Settings,
  DEFAULT_L2S2_SETTINGS,
  StoryCompressedCandidate,
  L2S2ProgressState,
  LENGTH_PRESETS_V2,
  SILENCE_REMOVAL_PRESETS_V2,
  calculateCandidateGuide
} from '@/types/longToShort2';

// Services
import { longToShortApi } from '@/services/longToShortApi';

// Subcomponents
import { LongToShort2WhatsDifferentModal } from '../long_to_short_2/LongToShort2WhatsDifferentModal';
import { LongToShort2SourceSection } from '../long_to_short_2/LongToShort2SourceSection';
import { LongToShort2SettingsPanel } from '../long_to_short_2/LongToShort2SettingsPanel';
import { LongToShort2ReframeCanvas } from '../long_to_short_2/LongToShort2ReframeCanvas';
import { LongToShort2CandidateCard } from '../long_to_short_2/LongToShort2CandidateCard';
import { LongToShort2OverlapModal } from '../long_to_short_2/LongToShort2OverlapModal';
import { VideoPreviewModal } from '@/components/shared/VideoPreviewModal';

interface LongToShort2TabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const LongToShort2Tab: React.FC<LongToShort2TabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 1. 소스 비디오 프로빙 상태
  const [probeData, setProbeData] = useState<VideoProbeResult | null>(null);

  // 2. 롱투숏2 전용 옵션 파라미터 (vw, jn, ji SSOT)
  const [settings, setSettings] = useState<LongToShort2Settings>(DEFAULT_L2S2_SETTINGS);

  // 3. 5단계 분석 진행률
  const [progress, setProgress] = useState<L2S2ProgressState>({
    stage: 'idle',
    percent: 0,
    message: ''
  });

  // 4. 이야기 압축 결과 후보군
  const [candidates, setCandidates] = useState<StoryCompressedCandidate[]>([]);

  // 5. 모달 제어 상태
  const [isWhatsDiffModalOpen, setIsWhatsDiffModalOpen] = useState<boolean>(false);
  const [isOverlapModalOpen, setIsOverlapModalOpen] = useState<boolean>(false);
  const [previewCandidate, setPreviewCandidate] = useState<StoryCompressedCandidate | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const isBusy = progress.stage !== 'idle' && progress.stage !== 'completed' && progress.stage !== 'failed';

  // 비디오 소스 프로빙 완료 콜백 (wc 가이드 실시간 반영)
  const handleProbeComplete = (data: VideoProbeResult) => {
    setProbeData(data);
    const guide = calculateCandidateGuide(data.duration_sec);
    setSettings(prev => ({
      ...prev,
      candidateCount: guide.recommended,
      analysisRange: {
        enabled: false,
        startSec: 0,
        endSec: Math.round(data.duration_sec)
      }
    }));
  };

  // 비디오 소스 초기화
  const handleClearSource = () => {
    setProbeData(null);
    setCandidates([]);
    setProgress({ stage: 'idle', percent: 0, message: '' });
  };

  // 후보 선택 토글
  const handleToggleSelectCandidate = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  // 후보별 댓글 포함 여부 토글
  const handleToggleCommentInCapCut = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, includeCommentInCapCut: !c.includeCommentInCapCut } : c));
  };

  // 후보별 댓글 인라인 커스텀 수정
  const handleUpdateCommentOverride = (id: string, override: { author: string; text: string }) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, customCommentOverride: override } : c));
  };

  // 분석 시작 버튼 클릭 (1단계 미완료 시 자동 스크롤 및 안내)
  const handleStartAnalysis = () => {
    if (!probeData?.video_path) {
      toast({
        variant: 'destructive',
        title: '⚠️ 원본 영상 선택 필요',
        description: '1단계(영상 보관함, 유튜브 수집, 로컬 파일)에서 영상을 먼저 선택해 주세요!'
      });
      const el = document.getElementById('long-to-short-source-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary', 'transition-all');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000);
      }
      return;
    }

    // 권장 개수 초과 시 중복 확인 모달 표시
    if (probeData.max_candidates && settings.candidateCount > probeData.recommended_candidates && !settings.allowOverlap) {
      setIsOverlapModalOpen(true);
      return;
    }

    runStoryCompressionAnalysis(settings.allowOverlap);
  };

  // 실제 이야기 압축 파이프라인 가동
  const runStoryCompressionAnalysis = async (allowOverlap: boolean) => {
    if (!probeData) return;

    // 1단계: 프로빙 및 분리
    setProgress({
      stage: 'probing',
      percent: 15,
      message: '1. 비디오 파일 검증 및 오디오 스트림 분리 중...',
      detail: probeData.file_name
    });

    try {
      // 2단계: 음성 전사
      setTimeout(() => {
        setProgress({
          stage: 'transcribing',
          percent: 35,
          message: '2. Faster-Whisper GPU 정밀 음성 전사 중...',
          detail: '긴 영상의 대화 맥락과 어휘를 텍스트로 고속 추출합니다.'
        });
      }, 700);

      // 3단계: 기승전결 서사 압축
      setTimeout(() => {
        setProgress({
          stage: 'story_segmenting',
          percent: 65,
          message: '3. AI 이야기 압축 엔진 기승전결 분석 중...',
          detail: '도입(Hook) ➔ 절정(Climax) ➔ 마무리(Resolution) 3단계 핵심 컷 슬라이싱...'
        });
      }, 1600);

      // 4단계: 화자 트래킹 및 리프레임
      setTimeout(() => {
        setProgress({
          stage: 'face_tracking',
          percent: 85,
          message: '4. AI 화자 얼굴 인식 및 9:16 동적 팬앤스캔 좌표 연산 중...',
          detail: `구도 모드: ${settings.framingMode}, 스무딩 계수: ${settings.smoothingFactor}`
        });
      }, 2500);

      // 백엔드 v2 이야기 압축 API 호출
      const res = await longToShortApi.analyzeStoryCompression({
        video_path: probeData.video_path,
        length_preset: settings.lengthPreset,
        candidate_count: settings.candidateCount,
        allow_overlap: allowOverlap,
        silence_removal: settings.silenceRemoval,
        framing_mode: settings.framingMode,
        smoothing_factor: settings.smoothingFactor,
        directives: settings.creativeDirectivePrompt,
        include_comments: settings.commentSettings.enabled,
        analysis_range: settings.analysisRange.enabled ? settings.analysisRange : undefined,
        multi_use_langs: settings.multiUseLangs
      } as any);

      // 5단계: 완료
      setProgress({
        stage: 'completed',
        percent: 100,
        message: '5. 이야기 압축 및 쇼츠 후보 카드 구성 완료!',
        detail: `총 ${res.candidates.length}개의 완결된 이야기 쇼츠가 생성되었습니다.`
      });

      setCandidates(res.candidates);

      toast({
        title: '🎉 롱투숏2 이야기 압축 완료',
        description: `총 ${res.candidates.length}개의 3단계 압축 쇼츠가 준비되었습니다.`
      });

    } catch (err: any) {
      setProgress({
        stage: 'failed',
        percent: 0,
        message: '이야기 압축 분석 실패',
        detail: err.message
      });
      toast({
        variant: 'destructive',
        title: '분석 실패',
        description: err.message || '오류가 발생했습니다.'
      });
    }
  };

  // 단일 CapCut 초안 내보내기
  const handleExportSingleCapCut = async (candidate: StoryCompressedCandidate) => {
    if (!probeData) return;
    try {
      toast({
        title: '🚀 CapCut 초안 생성 시작',
        description: `'${candidate.title}'의 3단 세그먼트를 CapCut 9:16 비파괴 트랙으로 조립 중...`
      });

      const res = await longToShortApi.exportStoryCapCut({
        video_path: probeData.video_path,
        candidates: [candidate],
        project_title: candidate.title.replace(/[^a-zA-Z0-9가-힣_]/g, '_'),
        framing_mode: candidate.framingMode,
        comments: candidate.customCommentOverride ? [candidate.customCommentOverride] : candidate.commentsOverlay,
        multi_use_langs: settings.multiUseLangs
      } as any);

      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, capcutExported: true } : c));

      toast({
        title: '✅ CapCut 초안 내보내기 완료',
        description: `프로젝트 저장 경로: 05_Exports/CapCut_Projects/${res.project_name}`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'CapCut 내보내기 실패',
        description: err.message || '초안을 생성하지 못했습니다.'
      });
    }
  };

  // 단일 MP4 클립 내보내기
  const handleExportSingleClip = async (candidate: StoryCompressedCandidate) => {
    if (!probeData) return;
    try {
      const firstSeg = candidate.segments[0];
      const lastSeg = candidate.segments[candidate.segments.length - 1];
      const res = await longToShortApi.exportClip({
        video_path: probeData.video_path,
        candidate: {
          start_sec: firstSeg?.startSec ?? 0,
          end_sec: lastSeg?.endSec ?? 60
        } as any,
        output_filename: `Story_${candidate.candidateIndex}_${Date.now()}.mp4`
      });

      toast({
        title: '🎬 고화질 MP4 내보내기 완료',
        description: `저장 위치: 05_Exports/Clips/${res.file_name}`
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: '클립 내보내기 실패',
        description: err.message
      });
    }
  };

  // 선택된 모든 후보 일괄 CapCut 초안 내보내기
  const handleExportSelectedAll = async () => {
    const selectedList = candidates.filter(c => c.selected);
    if (selectedList.length === 0 || !probeData) {
      toast({ variant: 'destructive', title: '선택 항목 없음', description: '내보낼 쇼츠 후보를 1개 이상 선택해 주세요.' });
      return;
    }

    setIsExportingAll(true);
    try {
      toast({
        title: '📦 일괄 CapCut 초안 패키징',
        description: `선택된 ${selectedList.length}개 쇼츠를 독립 CapCut 프로젝트로 동시 생성 중...`
      });

      for (const item of selectedList) {
        await longToShortApi.exportStoryCapCut({
          video_path: probeData.video_path,
          candidates: [item],
          project_title: item.title.replace(/[^a-zA-Z0-9가-힣_]/g, '_'),
          framing_mode: item.framingMode,
          comments: item.customCommentOverride ? [item.customCommentOverride] : item.commentsOverlay,
          multi_use_langs: settings.multiUseLangs
        } as any);
      }

      setCandidates(prev => prev.map(c => c.selected ? { ...c, capcutExported: true } : c));

      // 하단 일괄 작업 큐 등록
      const batchJobs = selectedList.map(item => ({
        id: `l2s2-job-${Date.now()}-${item.candidateIndex}`,
        title: item.title,
        sourceType: 'video',
        archetype: 'classic',
        tabId: 'long-to-short-2',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: item.segments.length,
        metadata: {
          framingMode: item.framingMode,
          smoothingFactor: item.smoothingFactor,
          totalDurationSec: item.totalDurationSec,
          vmiScore: item.vmiScore,
          segments: item.segments,
          includeCommentInCapCut: item.includeCommentInCapCut,
          customCommentOverride: item.customCommentOverride
        }
      }));
      onAddBatchJobs(batchJobs);

      toast({
        title: '🎉 일괄 CapCut 내보내기 및 큐 등록 완료',
        description: `${selectedList.length}개의 프로젝트가 05_Exports 저장소 및 하단 대기열에 추가되었습니다.`
      });

    } catch (err: any) {
      toast({ variant: 'destructive', title: '일괄 내보내기 오류', description: err.message });
    } finally {
      setIsExportingAll(false);
    }
  };

  // 공통 메인 실행 버튼 컴포넌트 (잘림 방지 및 어디서든 직관적 클릭)
  const renderExecutionActionBar = () => {
    const isReady = !!probeData?.video_path;

    return (
      <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-2.5">
        <Button
          type="button"
          disabled={isBusy}
          onClick={handleStartAnalysis}
          className={cn(
            "w-full h-13 text-sm font-black gap-2.5 shadow-md transition-all cursor-pointer flex items-center justify-center",
            isReady
              ? "bg-gradient-to-r from-primary via-indigo-600 to-primary text-primary-foreground hover:opacity-95 ring-2 ring-primary/30 animate-pulse"
              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
          )}
        >
          {isBusy ? (
            <>
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>AI 이야기 압축 및 화자 트래킹 분석 중... ({progress.percent}%)</span>
            </>
          ) : isReady ? (
            <>
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>
                ⚡ 이야기 압축 쇼츠 {settings.candidateCount}개 생성 시작 ({LENGTH_PRESETS_V2[settings.lengthPreset].label})
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>1단계: 원본 영상을 먼저 선택하면 분석을 시작할 수 있습니다 (클릭 시 이동)</span>
            </>
          )}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground px-1 font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Faster-Whisper GPU 음성인식 ➔ AI 서사 압축 ➔ CapCut 9:16 비파괴 조립
          </span>
          {isReady && (
            <span className="text-primary font-bold">
              선택된 영상: {probeData.file_name} ({probeData.duration_label})
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 롱투숏2 상단 헤더 배너 (픽셀링 kh & kv 1:1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-card to-card border border-border shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-[10px] font-mono font-bold">
              PIXELING V2 SOVEREIGN
            </Badge>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              롱투숏2 이야기 압축 제작실
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            긴 영상을 작은 이야기 단위(도입·절정·마무리 3단계)로 압축 분석하고 9:16 오토 리프레임 CapCut 초안을 조립합니다.
          </p>
        </div>

        {/* 롱투숏2 차이점 모달 버튼 */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsWhatsDiffModalOpen(true)}
          className="h-9 px-3.5 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0 shadow-2xs"
        >
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          <span>롱투숏2, 뭐가 다른가요?</span>
        </Button>
      </div>

      {/* 3-ZONE 메인 레이아웃 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Zone 1: 원천 소스 인입 및 세부 설정 패널 (좌측 6칸) */}
        <div className="lg:col-span-6 space-y-4">
          <LongToShort2SourceSection
            probeData={probeData}
            onProbeComplete={handleProbeComplete}
            onClearSource={handleClearSource}
            disabled={isBusy}
          />

          <LongToShort2SettingsPanel
            settings={settings}
            onChangeSettings={setSettings}
            durationSec={probeData?.duration_sec}
            disabled={isBusy}
          />

          {/* 좌측 하단 메인 실행 버튼 (좌측 작업 완료 후 즉시 클릭 가능) */}
          {renderExecutionActionBar()}
        </div>

        {/* Zone 2: 9:16 동적 팬앤스캔 캔버스 프리뷰 및 우측 인터랙션 (우측 6칸) */}
        <div className="lg:col-span-6 space-y-4">
          <LongToShort2ReframeCanvas
            videoTitle={probeData?.file_name}
            videoPath={probeData?.video_path}
            framingMode={settings.framingMode}
            smoothingFactor={settings.smoothingFactor}
            commentsEnabled={settings.commentSettings.enabled}
            commentPosition={settings.commentSettings.position}
          />

          {/* 우측 하단 메인 실행 버튼 (우측 화면 주시 중에도 바로 클릭 가능) */}
          {renderExecutionActionBar()}
        </div>
      </div>

      {/* Zone 3: 실시간 진행률 트래커 (분석 중 또는 완료 시 노출) */}
      {progress.stage !== 'idle' && (
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-foreground">
              {progress.stage === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
              )}
              {progress.message}
            </span>
            <span className="font-mono text-primary">{progress.percent}%</span>
          </div>

          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {progress.detail && (
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {progress.detail}
            </p>
          )}
        </div>
      )}

      {/* Zone 4: 생성된 이야기 압축 쇼츠 후보 목록 카드 그리드 */}
      {candidates.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                추출된 이야기 압축 쇼츠 후보 ({candidates.length}개)
              </h3>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                STORY COMPRESSED
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = candidates.every(c => c.selected);
                  setCandidates(prev => prev.map(c => ({ ...c, selected: !allSelected })));
                }}
                className="h-8 text-xs font-bold cursor-pointer"
              >
                전체 선택 / 해제
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isExportingAll || candidates.filter(c => c.selected).length === 0}
                onClick={handleExportSelectedAll}
                className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>선택 {candidates.filter(c => c.selected).length}개 일괄 CapCut 초안 내보내기</span>
              </Button>
            </div>
          </div>

          {/* 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map(cand => (
              <LongToShort2CandidateCard
                key={cand.id}
                candidate={cand}
                onToggleSelect={handleToggleSelectCandidate}
                onPreview={setPreviewCandidate}
                onExportCapCut={handleExportSingleCapCut}
                onExportClip={handleExportSingleClip}
                onToggleCommentInCapCut={handleToggleCommentInCapCut}
                onUpdateCommentOverride={handleUpdateCommentOverride}
                isExporting={isExportingAll}
              />
            ))}
          </div>
        </div>
      )}

      {/* 모달 1: 롱투숏2 차이점 안내 모달 (kv) */}
      <LongToShort2WhatsDifferentModal
        isOpen={isWhatsDiffModalOpen}
        onClose={() => setIsWhatsDiffModalOpen(false)}
      />

      {/* 모달 2: 중복 구간 허용 여부 모달 (kf) */}
      {probeData && (
        <LongToShort2OverlapModal
          isOpen={isOverlapModalOpen}
          requestedCount={settings.candidateCount}
          maxUniqueCount={probeData.recommended_candidates || 3}
          durationLabel={probeData.duration_label}
          onConfirm={allow => {
            setSettings(prev => ({ ...prev, allowOverlap: allow }));
            runStoryCompressionAnalysis(allow);
          }}
          onClose={() => setIsOverlapModalOpen(false)}
        />
      )}

      {/* 모달 3: 비디오 프리뷰 모달 (100% 정상 작동 복원) */}
      {previewCandidate && (
        <VideoPreviewModal
          open={!!previewCandidate}
          onOpenChange={(open) => { if (!open) setPreviewCandidate(null); }}
          title={previewCandidate.title}
          filePath={probeData?.video_path}
          sourceType="queue"
          videoData={{
            id: previewCandidate.id,
            title: previewCandidate.title,
            description: `${previewCandidate.hookSummary}\n\n${previewCandidate.reason}`,
            duration: previewCandidate.totalDurationSec,
            subtitles: previewCandidate.segments.map(seg => ({
              id: seg.id,
              startSec: seg.startSec,
              endSec: seg.endSec,
              text: seg.transcript,
              role: seg.roleLabel
            })),
            youtube_title: previewCandidate.title,
            youtube_description: `${previewCandidate.hookSummary}\n\n#쇼츠 #이야기압축 #롱투숏2`,
            youtube_tags: '쇼츠, 하이라이트, 롱투숏2, 이야기압축'
          }}
          onExportCapcut={() => handleExportSingleCapCut(previewCandidate)}
        />
      )}
    </div>
  );
};
