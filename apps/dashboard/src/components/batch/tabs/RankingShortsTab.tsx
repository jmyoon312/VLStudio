import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  RankingCreationMode,
  RankingOptions,
  RankingItem,
  RANKING_TEMPLATES,
  RANKING_SOUND_STYLES
} from '@/types/ranking';
import { RankingPresetSidebar } from '../ranking/RankingPresetSidebar';
import { RankingSourceSection } from '../ranking/RankingSourceSection';
import { RankingPlanReviewSection } from '../ranking/RankingPlanReviewSection';
import { RankingCanvasPreview } from '../ranking/RankingCanvasPreview';
import { SourceItem } from './OneTakeBatchTab';

interface RankingShortsTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const RankingShortsTab: React.FC<RankingShortsTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  // 1. 제작 모드 및 메인 상태
  const [creationMode, setCreationMode] = useState<RankingCreationMode>('single-video');
  const [rankingTopic, setRankingTopic] = useState<string>('한국인이 가장 사랑하는 배달 야식');
  const [rankingCriteria, setRankingCriteria] = useState<string>('주문량 및 선호도 통계');
  const [targetCount, setTargetCount] = useState<number>(5);

  // 2. 계획 검토 모드 토글
  const [isPlanReviewMode, setIsPlanReviewMode] = useState<boolean>(false);
  const [headline, setHeadline] = useState<string>('한국인이 사랑하는 배달 야식');
  const [subtitle, setSubtitle] = useState<string>('배달 음식 선호도 TOP 5');

  // 3. 순위 아이템 목록 (기본 초기값 TOP 5)
  const [rankingItems, setRankingItems] = useState<RankingItem[]>([
    {
      id: 'rank-5',
      rank: 5,
      title: '보쌈 & 족발',
      statValue: '선호도 11.2%',
      description: '쫀득한 식감과 푸짐한 쌈의 조화',
      hookJabText: '*TOP 5*',
      startMs: 0,
      durationMs: 4500,
      sourceIndex: 0,
      candidates: [],
      blurRegions: []
    },
    {
      id: 'rank-4',
      rank: 4,
      title: '피자 & 파스타',
      statValue: '선호도 14.8%',
      description: '치즈가 듬뿍 들어간 불패의 야식',
      hookJabText: '*TOP 4*',
      startMs: 5000,
      durationMs: 4500,
      sourceIndex: 0,
      candidates: [],
      blurRegions: []
    },
    {
      id: 'rank-3',
      rank: 3,
      title: '매운 떡볶이 & 튀김',
      statValue: '선호도 19.5%',
      description: '스트레스 한 방에 날리는 칼칼한 매운맛',
      hookJabText: '*TOP 3*',
      startMs: 10000,
      durationMs: 4500,
      sourceIndex: 0,
      candidates: [],
      blurRegions: []
    },
    {
      id: 'rank-2',
      rank: 2,
      title: '삼겹살 구이 배달',
      statValue: '선호도 24.1%',
      description: '구워져서 바로 오는 최고의 소주 안주',
      hookJabText: '*TOP 2*',
      startMs: 15000,
      durationMs: 4500,
      sourceIndex: 0,
      candidates: [],
      blurRegions: []
    },
    {
      id: 'rank-1',
      rank: 1,
      title: '후라이드 & 양념 치킨',
      statValue: '선호도 30.4%',
      description: '부동의 1위! 치맥의 절대 강자',
      hookJabText: '*TOP 1*',
      startMs: 20000,
      durationMs: 5000,
      sourceIndex: 0,
      candidates: [],
      blurRegions: []
    },
  ]);

  // 4. 템플릿 및 사운드 연출 옵션 (기본 failsup-ranking)
  const [options, setOptions] = useState<RankingOptions>({
    templateId: 'failsup-ranking',
    shape: 'pill',
    headerBackgroundColor: RANKING_TEMPLATES['failsup-ranking'].palette.headerBackground,
    headlineColor: RANKING_TEMPLATES['failsup-ranking'].palette.headline,
    subtitleColor: RANKING_TEMPLATES['failsup-ranking'].palette.subtitle,
    accentColor: RANKING_TEMPLATES['failsup-ranking'].palette.accent,
    strokeColor: RANKING_TEMPLATES['failsup-ranking'].palette.stroke,
    rankDisplayMode: 'current',
    order: 'reverse', // 5위 -> 1위 카운트다운
    transitionSound: true,
    transitionSoundStyle: 'impact',
    transitionSoundVolume: 85,
    transitionSoundOffsetMs: 160,
    transitionBlackoutMs: 200,
    bgmEnabled: true,
    bgmVolume: 25,
    ducking: 40,
    enableJaejaebiText: true,
    enableSituationText: true,
    voiceId: 'ko-KR-SunHiNeural'
  });

  // 5. 소스 영상 보관함 및 선택 상태
  const [videoLibrary, setVideoLibrary] = useState<SourceItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<SourceItem | null>(null);
  const [multiVideoList, setMultiVideoList] = useState<SourceItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 영상 보관함 (07_Downloads) 비디오 목록 로드
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get('/videos/', { params: { mode: 'video', limit: 100 } });
        if (res.data && Array.isArray(res.data)) {
          const mapped: SourceItem[] = res.data.map((v: any) => ({
            id: `video-${v.id}`,
            title: v.title || `영상 미디어 #${v.id}`,
            snippet: v.description || `${v.channel_name || '07_Downloads'} · ${v.duration ? Math.round(v.duration) + '초' : '쇼츠'}`,
            sourceOrigin: v.channel_name || '07_Downloads',
            dateText: v.upload_date ? new Date(v.upload_date).toLocaleDateString() : '최신 수집',
            metadata: {
              ...v,
              videoPath: v.file_path,
              sourceUrl: v.file_path,
              thumbnailUrl: v.thumbnail_path,
              durationText: v.duration ? `${Math.floor(v.duration / 60)}:${Math.round(v.duration % 60).toString().padStart(2, '0')}` : undefined,
              viewsCount: v.view_count,
              category: v.computedCategory || v.category || '영상 보관함'
            }
          }));
          setVideoLibrary(mapped);
          if (mapped.length > 0 && !selectedVideo) {
            setSelectedVideo(mapped[0]);
          }
        }
      } catch (e) {
        console.warn('영상 보관함 로드 실패:', e);
      }
    };

    fetchVideos();
  }, []);

  // Multi-Source 비디오 추가/제거
  const handleAddMultiVideo = (item: SourceItem) => {
    setMultiVideoList(prev => [...prev, item].slice(0, targetCount));
  };

  const handleRemoveMultiVideo = (id: string) => {
    setMultiVideoList(prev => prev.filter(v => v.id !== id));
  };

  // AI 하이라이트 씬 분석 실행 (Single-Video 모드)
  const handleStartAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const payload = {
        videoPath: selectedVideo?.metadata?.videoPath || selectedVideo?.metadata?.file_path,
        rankingTopic,
        rankingCriteria,
        sceneCount: targetCount
      };

      const res = await api.post('/ranking/analyze-source', payload);
      if (res.data && res.data.items) {
        setHeadline(res.data.headline || `${rankingTopic} TOP ${targetCount}`);
        setSubtitle(res.data.subtitle || `${rankingCriteria} 랭킹`);
        setRankingItems(res.data.items);
        setIsPlanReviewMode(true);

        toast({
          title: '✨ AI 씬 분석 및 계획 완료',
          description: `총 ${res.data.items.length}개 순위 장면이 성공적으로 추출되었습니다. 계획을 검토하세요.`
        });
      } else {
        throw new Error('응답 데이터에 순위 항목이 없습니다.');
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: '분석 실패',
        description: e.message || 'AI 씬 분석 중 오류가 발생했습니다.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AI 순위 대본 자동 구성 실행 (Multi-Source 모드)
  const handleStartGenerateScript = async () => {
    setIsAnalyzing(true);
    try {
      const payload = {
        rankingTopic,
        rankingCriteria,
        itemCount: targetCount
      };

      const res = await api.post('/ranking/generate-script', payload);
      if (res.data && res.data.items) {
        setHeadline(res.data.headline || `${rankingTopic} TOP ${targetCount}`);
        setSubtitle(res.data.subtitle || `${rankingCriteria} 랭킹`);

        // multiVideoList 매칭
        const mappedItems: RankingItem[] = res.data.items.map((it: any, idx: number) => {
          const video = multiVideoList[idx] || multiVideoList[0];
          return {
            id: `rank-${it.rank}`,
            rank: it.rank,
            title: it.title,
            statValue: it.statValue || '',
            description: it.description || '',
            hookJabText: it.hookJabText || `*TOP ${it.rank}*`,
            startMs: 0,
            durationMs: 4500,
            sourceIndex: idx,
            sourceUrl: video?.metadata?.videoPath || video?.metadata?.file_path,
            candidates: [],
            blurRegions: []
          };
        });

        setRankingItems(mappedItems);
        setIsPlanReviewMode(true);

        toast({
          title: '✨ AI 순위 대본 구성 완료',
          description: `${targetCount}개 클립에 매칭된 랭킹 계획이 구성되었습니다.`
        });
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: '대본 생성 실패',
        description: e.message || '오류가 발생했습니다.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 최종 랭킹 쇼츠 일괄 생성 발주
  const handleStartFinalBatch = async () => {
    setIsSubmitting(true);
    try {
      const jobId = `ranking-${Date.now()}`;
      const payload = {
        id: jobId,
        creationMode,
        rankingTopic,
        rankingCriteria,
        headline,
        subtitle,
        items: rankingItems,
        options,
        sourceVideoPath: selectedVideo?.metadata?.videoPath || selectedVideo?.metadata?.file_path
      };

      // 백엔드 API 호출하여 CapCut 초안 및 작업 등록
      const res = await api.post('/ranking/jobs', payload);

      const newJob = {
        id: jobId,
        title: `[랭킹쇼츠] ${headline} (TOP ${rankingItems.length})`,
        sourceType: 'ranking-shorts',
        archetype: 'gunlimbo',
        tabId: 'ranking-shorts',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: rankingItems.length,
        resultVideoPath: res.data?.capcutDraftPath,
        metadata: {
          ...payload,
          capcutDraftPath: res.data?.capcutDraftPath
        }
      };

      onAddBatchJobs([newJob]);

      toast({
        title: '🏆 랭킹 쇼츠 생성 완료',
        description: `'${headline}' 프로젝트의 CapCut 초안이 조립되어 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: '생성 실패',
        description: e.message || '서버 통신 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Zone 1 (좌측 3.5칸): 9대 공식 템플릿 & 사운드 시퀀서 사이드바 */}
        <div className="lg:col-span-3 xl:col-span-3">
          <RankingPresetSidebar
            options={options}
            onChangeOptions={setOptions}
          />
        </div>

        {/* Zone 2 (중앙 5.5칸): 소스 선택기 또는 계획 검토기 (Plan Review) */}
        <div className="lg:col-span-5 xl:col-span-5.5 bg-card border border-border rounded-xl p-4 shadow-xs">
          {!isPlanReviewMode ? (
            <RankingSourceSection
              creationMode={creationMode}
              onChangeCreationMode={setCreationMode}
              rankingTopic={rankingTopic}
              onChangeRankingTopic={setRankingTopic}
              rankingCriteria={rankingCriteria}
              onChangeRankingCriteria={setRankingCriteria}
              targetCount={targetCount}
              onChangeTargetCount={setTargetCount}
              videoLibrary={videoLibrary}
              selectedVideo={selectedVideo}
              onSelectVideo={setSelectedVideo}
              multiVideoList={multiVideoList}
              onAddMultiVideo={handleAddMultiVideo}
              onRemoveMultiVideo={handleRemoveMultiVideo}
              onStartAnalyze={handleStartAnalyze}
              onStartGenerateScript={handleStartGenerateScript}
              isAnalyzing={isAnalyzing}
            />
          ) : (
            <RankingPlanReviewSection
              headline={headline}
              subtitle={subtitle}
              onChangeHeadline={setHeadline}
              onChangeSubtitle={setSubtitle}
              items={rankingItems}
              onChangeItems={setRankingItems}
              onBackToSource={() => setIsPlanReviewMode(false)}
            />
          )}
        </div>

        {/* Zone 3 (우측 3.5칸): 9:16 모바일 쇼츠 실시간 라이브 캔버스 프리뷰 */}
        <div className="lg:col-span-4 xl:col-span-3.5 bg-card border border-border rounded-xl p-4 shadow-xs">
          <RankingCanvasPreview
            headline={headline}
            subtitle={subtitle}
            items={rankingItems}
            options={options}
            onStartFinalBatch={handleStartFinalBatch}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};
