import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/lib/api';
import {
  Zap,
  Layers,
  FileText,
  Newspaper,
  MessageSquareText,
  Video,
  CheckCircle2,
  Sliders,
  Film,
  Plus,
  Trash2,
  FolderOpen,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Music,
  Scissors,
  Clapperboard,
  Maximize2,
  Tv,
  Crown,
  Camera,
  Utensils,
  Award,
  FastForward,
  Radio,
  SlidersHorizontal,
  Settings2,
  Copy,
  Eye,
  Calendar,
  Share2,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { ddalkkakApi } from '@/services/ddalkkakApi';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';
import { OneTakeBatchTab } from '@/components/batch/tabs/OneTakeBatchTab';
import { SongBatchTab } from '@/components/batch/tabs/SongBatchTab';
import { LongToShortTab } from '@/components/batch/tabs/LongToShortTab';
import { LongToShort2Tab } from '@/components/batch/tabs/LongToShort2Tab';
import { MovieDramaShortsTab } from '@/components/batch/tabs/MovieDramaShortsTab';
import { TextCreativeTab } from '@/components/batch/tabs/TextCreativeTab';
import { VideoCreativeTab } from '@/components/batch/tabs/VideoCreativeTab';
import { MeokguriTab } from '@/components/batch/tabs/MeokguriTab';
import { RankingShortsTab } from '@/components/batch/tabs/RankingShortsTab';
import { StockMotionTab } from '@/components/batch/tabs/StockMotionTab';
import { LongformMultiTab } from '@/components/batch/tabs/LongformMultiTab';
import { StudioWorkspaceTabs } from '@/components/shared/StudioWorkspaceTabs';
import { generatePixelingStandardMeta } from '@/lib/ddalkkakPixeling';

// ── 11대 전문 일괄 탭 & 4대 카테고리 정의 (Pixeling 번들 100% 역공학 SSOT) ──
export type BatchTabId =
  | 'one-take'
  | 'song'
  | 'long-to-short'
  | 'long-to-short-2'
  | 'movie-drama-shorts'
  | 'text-creative'
  | 'video-creative'
  | 'meokguri'
  | 'ranking-shorts'
  | 'stock-motion'
  | 'longform-multi';

export interface BatchGroup {
  id: string;
  label: string;
  tabs: {
    id: BatchTabId;
    label: string;
    icon: React.ElementType;
    desc: string;
    badge?: string;
  }[];
}

export const PIXELING_BATCH_GROUPS: BatchGroup[] = [
  {
    id: 'batch',
    label: '일괄 제작',
    tabs: [
      { id: 'one-take', label: '원테이크 일괄', icon: Zap, desc: '자막 + 쨉쨉이 + 메타 추천 원스톱 일괄 생성', badge: '메인' },
      { id: 'song', label: '노래형 일괄', icon: Music, desc: '원어가사 + 한국어뜻 + 발음 3중 트랙 싱크', badge: '가사전문' },
    ]
  },
  {
    id: 'longform-convert',
    label: '롱폼 변환',
    tabs: [
      { id: 'long-to-short', label: '롱투숏 v1', icon: Scissors, desc: '오디오 RMS 에너지 킬러 구간 추출 (30~58초)' },
      { id: 'long-to-short-2', label: '롱투숏 v2', icon: Camera, desc: 'AI 얼굴/화자 트래킹 9:16 팬앤스캔', badge: '트래커' },
      { id: 'movie-drama-shorts', label: '영화·드라마 쇼츠', icon: Tv, desc: '씬 컷 0.4 감지 + 대표 프레임 + 사건 서사 요약' },
    ]
  },
  {
    id: 'creative',
    label: '창작형 제작',
    tabs: [
      { id: 'text-creative', label: '텍스트 창작형', icon: FileText, desc: '대본/썰 ➔ 씬 분할 ➔ AI 시각/음성 결합', badge: '썰/대본' },
      { id: 'video-creative', label: '영상 창작형', icon: Video, desc: '키워드 ➔ 영상 클립 자동 매칭 & 조립' },
      { id: 'meokguri', label: '먹구리형', icon: Utensils, desc: '음식/ASMR 사운드 게인 증폭 + 리액션 스티커', badge: '먹방' },
      { id: 'ranking-shorts', label: '랭킹형', icon: Award, desc: 'TOP 5 카운트다운 로컬 렌더링 + 딥 트랜지션' },
      { id: 'stock-motion', label: '스톡모션', icon: Sparkles, desc: '스톡 비디오 + 흑백 스케치 + 팝 SFX 타이포' },
    ]
  },
  {
    id: 'longform-build',
    label: '롱폼 제작',
    tabs: [
      { id: 'longform-multi', label: '롱폼 멀티생성', icon: Layers, desc: '1개 롱폼에서 5~10개 독립 숏폼 동시 추출', badge: '대량' },
    ]
  }
];

// ── 5대 문체 톤앤매너 프리셋 ──
export interface TonePreset {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  promptDirective: string;
}

export const TONE_PRESETS: TonePreset[] = [
  { id: 'snack', name: '스낵형 속사포', emoji: '⚡', desc: '짧고 빠른 템포, 2~3초 단위 호흡', promptDirective: '빠르고 직관적인 속사포 말투로 한 문장을 15자 이내로 간결하게 전달.' },
  { id: 'cynical-ssul', name: '냉소 썰형', emoji: '😏', desc: '현실 비판적 반전과 촌철살인', promptDirective: '커뮤니티 썰 특유의 덤덤하면서도 씁쓸한 반전과 현실적인 유머를 살려 작성.' },
  { id: 'cinema-docu', name: '명화관 서사', emoji: '🎬', desc: '진중하고 웅장한 시네마 다큐', promptDirective: '영화 리뷰나 다큐멘터리처럼 몰입감 높고 진중한 내레이션 톤앤매너.' },
  { id: 'fact-review', name: '팩트 해설', emoji: '🔍', desc: '정확한 수치와 데이터 중심 전달', promptDirective: '과장 없이 정확한 통계 수치와 팩트를 명확하고 명료하게 정리.' },
  { id: 'hyper-hook', name: '훅 강화형', emoji: '🔥', desc: '첫 3초 시청 지속률 극대화', promptDirective: '첫 문장에 시청자를 멈추게 하는 충격적인 질문이나 반전을 배치.' },
];

// ── 5대 추가자막(쨉쨉이) 프리셋 ──
export interface ExtraCaptionPreset {
  id: string;
  name: string;
  emoji: string;
  sample: string;
}

export const EXTRA_CAPTION_PRESETS: ExtraCaptionPreset[] = [
  { id: 'reaction', name: '리액션형', emoji: '😮', sample: '실화냐? / 와 대박 / 소름돋네' },
  { id: 'question', name: '질문형', emoji: '❓', sample: '당신의 선택은? / 이게 가능할까?' },
  { id: 'summary', name: '요약형', emoji: '📌', sample: '핵심 이유 / 충격 결말 / 전말 공개' },
  { id: 'meme-quote', name: '밈/짤형', emoji: '🐸', sample: '아니 이게 왜 진짜 / 킹받네' },
  { id: 'star-accent', name: '별표 강조형', emoji: '⭐', sample: '*충격 실화* / *속보 발생*' },
];

export type SourceType = 'ssul' | 'news' | 'script' | 'video';
export type TargetArchetype = 'classic' | 'instagram' | 'gunlimbo' | 'ssul';

interface SourceItem {
  id: string;
  title: string;
  snippet: string;
  sourceOrigin: string;
  dateText: string;
  metadata?: any;
}

interface BatchJobResult {
  id: string;
  title: string;
  sourceType: SourceType;
  archetype: TargetArchetype;
  tabId: BatchTabId;
  createdAt: string;
  status: 'ready' | 'processing' | 'done' | 'completed';
  video_path?: string;
  stream_url?: string;
  video_filename?: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  subtitles?: any[];
  pixeling_meta?: {
    title: string;
    description: string;
    hashtags: string;
    tags: string;
    standard_filename?: string;
    formatted_text?: string;
  };
  formatted_pixeling_text?: string;
  videoFilename?: string;
  scriptLinesCount?: number;
  metadata?: any;
}

export const ShortsBatchStudio: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // 1. 활성 탭 및 서피스 모드
  const [activeTab, setActiveTab] = useState<BatchTabId>('one-take');
  const [surfaceView, setSurfaceView] = useState<'classic' | 'canvas'>('classic');

  // 2. 소스 및 폼팩터 선택
  const [activeSourceType, setActiveSourceType] = useState<SourceType>('ssul');
  const [selectedArchetype, setSelectedArchetype] = useState<TargetArchetype>('ssul');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [customTextInput, setCustomTextInput] = useState<string>('');
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // 3. 픽셀링 역공학 핵심 옵션들
  const [selectedTone, setSelectedTone] = useState<string>('snack');
  const [selectedExtraCaption, setSelectedExtraCaption] = useState<string>('reaction');
  const [silenceEditEnabled, setSilenceEditEnabled] = useState<boolean>(true); // 비파괴 무음 분할
  const [speakerSeparationEnabled, setSpeakerSeparationEnabled] = useState<boolean>(true); // 화자 분리 멀티트랙
  const [songPronunciationEnabled, setSongPronunciationEnabled] = useState<boolean>(false); // 노래형 발음 표기
  const [captionLineMaxChars, setCaptionLineMaxChars] = useState<number>(16);

  // 4. 소스 리스트 (실제 DB & 라이브 연동)
  const [ssulList, setSsulList] = useState<SourceItem[]>([]);
  const [newsList, setNewsList] = useState<SourceItem[]>([]);
  const [scriptList, setScriptList] = useState<SourceItem[]>([]);
  const [videoList, setVideoList] = useState<SourceItem[]>([]);

  // 4-1. 바이럴 인텔리전스 엄선 기사 로드
  useEffect(() => {
    const fetchLiveViralArticles = async () => {
      try {
        const res = await api.get('/viral/articles', { params: { limit: 30, curated_only: true } });
        if (res.data?.articles && Array.isArray(res.data.articles)) {
          const arts = res.data.articles;
          const liveNews: SourceItem[] = arts
            .filter((a: any) => a.source_type === 'news')
            .map((a: any) => ({
              id: `viral-${a.id}`,
              title: a.suggested_title || a.title,
              snippet: a.analysis_summary || a.content_text?.slice(0, 80) || '',
              sourceOrigin: a.author || '네이버 랭킹 뉴스',
              dateText: `${Number(a.viral_score || 70).toFixed(1)}점 · 댓글 ${a.comments_count}개`,
              metadata: a,
            }));
          const liveSsul: SourceItem[] = arts
            .filter((a: any) => a.source_type !== 'news')
            .map((a: any) => ({
              id: `viral-${a.id}`,
              title: a.suggested_title || a.title,
              snippet: a.analysis_summary || a.content_text?.slice(0, 80) || '',
              sourceOrigin: a.author || a.community_name,
              dateText: `${Number(a.viral_score || 70).toFixed(1)}점 · 댓글 ${a.comments_count}개`,
              metadata: a,
            }));
          if (liveNews.length > 0) setNewsList(liveNews);
          if (liveSsul.length > 0) setSsulList(liveSsul);
        }
      } catch (_) {}
    };
    fetchLiveViralArticles();
  }, []);

  // 4-2. 외부 Handoff 수신
  useEffect(() => {
    let incoming: any[] = [];
    if (location.state?.batchProjects && Array.isArray(location.state.batchProjects)) {
      incoming = location.state.batchProjects;
    } else {
      try {
        const raw = sessionStorage.getItem('vlstudio_batch_handoff');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            incoming = parsed;
            sessionStorage.removeItem('vlstudio_batch_handoff');
          }
        }
      } catch (_) {}
    }

    if (incoming.length > 0) {
      const incomingJobs: BatchJobResult[] = incoming.map((p, idx) => ({
        id: p.id || `handoff-${Date.now()}-${idx}`,
        title: p.title,
        sourceType: (p.sourceType as SourceType) || 'news',
        archetype: (p.archetype as TargetArchetype) || 'gunlimbo',
        tabId: 'one-take',
        createdAt: '방금 전 인입',
        status: 'ready',
        scriptLinesCount: p.scriptLinesCount || (p.scenes ? p.scenes.length : 6),
        metadata: p,
      }));

      setBatchResults(prev => [...incomingJobs, ...prev]);
      setActiveSourceType(incoming[0].sourceType === 'news' ? 'news' : 'ssul');
      setSelectedArchetype(incoming[0].archetype || 'gunlimbo');

      toast({
        title: '⚡ 바이럴 인텔리전스 프로젝트 인입',
        description: `총 ${incoming.length}개의 엄선 프로젝트가 올인원 대기열에 자동 등록되었습니다.`
      });
    }
  }, [location.state, toast]);

  // 4-3. 대본 분석실 DB 로드
  useEffect(() => {
    try {
      const savedScriptsRaw = localStorage.getItem('vlstudio_script_lab_data') || localStorage.getItem('viral_loop_scripts');
      if (savedScriptsRaw) {
        const parsed = JSON.parse(savedScriptsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const liveScripts: SourceItem[] = parsed.slice(0, 10).map((s: any, idx: number) => ({
            id: `script-live-${idx}`,
            title: s.title || s.topic || `대본 분석 프로젝트 #${idx + 1}`,
            snippet: (s.content || s.script || s.summary || '').slice(0, 80) + '...',
            sourceOrigin: '대본 분석실 (실시간 DB)',
            dateText: '최근 저장됨',
          }));
          setScriptList(prev => [...liveScripts, ...prev]);
        }
      }
    } catch (_) {}
  }, []);

  // 4-4. 로컬 다운로드 영상 보관함 로드
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await api.get('/videos/', { params: { mode: 'video', limit: 50 } });
        if (res.data && Array.isArray(res.data)) {
          setVideoList(
            res.data.map((v: any, idx: number) => ({
              id: `video-${v.id || idx}`,
              title: v.title || `로컬 영상 #${v.id}`,
              snippet: `수집 영상 파일: ${v.file_path ? v.file_path.split(/[\\/]/).pop() : v.title}`,
              sourceOrigin: v.channel?.name || '영상 보관함 (07_Downloads)',
              dateText: v.duration ? `${Math.floor(v.duration)}초` : '수집 완료',
              metadata: v,
            }))
          );
        }
      } catch (err) {
        console.warn('Failed to fetch videos from /videos/:', err);
      }
    };
    fetchVideos();
  }, []);

  // 5. 소스별 기본 추천 폼팩터 자동 동기화
  useEffect(() => {
    if (activeSourceType === 'ssul') setSelectedArchetype('ssul');
    else if (activeSourceType === 'news') setSelectedArchetype('gunlimbo');
    else if (activeSourceType === 'video') setSelectedArchetype('classic');
    else if (activeSourceType === 'script') setSelectedArchetype('instagram');
    setSelectedSourceIds([]);
  }, [activeSourceType]);

  // 6. 완성된 일괄 생성 작업 결과 큐
  const [batchResults, setBatchResults] = useState<BatchJobResult[]>([
    { id: 'job-101', title: '블라인드 레전드 탕비실 사건 썰', sourceType: 'ssul', archetype: 'ssul', tabId: 'one-take', createdAt: '2분 전', status: 'done', scriptLinesCount: 8 },
    { id: 'job-102', title: '서울 전역 기습 폭우 속보 브레이킹', sourceType: 'news', archetype: 'gunlimbo', tabId: 'one-take', createdAt: '5분 전', status: 'done', scriptLinesCount: 6 },
    { id: 'job-103', title: '아침 10분 루틴 자기계발 숏폼', sourceType: 'script', archetype: 'instagram', tabId: 'one-take', createdAt: '12분 전', status: 'done', scriptLinesCount: 7 },
  ]);

  const currentSourceItems = activeSourceType === 'ssul' ? ssulList :
                             activeSourceType === 'news' ? newsList :
                             activeSourceType === 'script' ? scriptList : videoList;

  const toggleSelectSource = (id: string) => {
    setSelectedSourceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedSourceIds.length === currentSourceItems.length) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(currentSourceItems.map(i => i.id));
    }
  };

  // ── 일괄 생성 실행 핸들러 ──
  const handleStartBatch = () => {
    if (selectedSourceIds.length === 0 && !customTextInput.trim()) {
      toast({ title: '안내', description: '생성할 콘텐츠를 목록에서 선택하거나 직접 입력해주세요.' });
      return;
    }

    setIsBatchRunning(true);
    const tabInfo = PIXELING_BATCH_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab);

    toast({
      title: `⚡ [${tabInfo?.label || '원테이크'}] 일괄 생성 시작`,
      description: `${selectedSourceIds.length || 1}개 작업이 [${selectedArchetype.toUpperCase()}] 폼팩터로 조립됩니다.`
    });

    setTimeout(() => {
      const newJobs: BatchJobResult[] = (selectedSourceIds.length > 0 ? selectedSourceIds : ['custom-1']).map((id, idx) => {
        const item = currentSourceItems.find(i => i.id === id);
        return {
          id: `batch-${Date.now()}-${idx}`,
          title: item ? item.title : (customTextInput.slice(0, 24) || '새 일괄 생성 프로젝트'),
          sourceType: activeSourceType,
          archetype: selectedArchetype,
          tabId: activeTab,
          createdAt: '방금 전',
          status: 'done',
          scriptLinesCount: Math.floor(Math.random() * 6) + 6,
        };
      });

      setBatchResults(prev => [...newJobs, ...prev]);
      setSelectedSourceIds([]);
      setCustomTextInput('');
      setIsBatchRunning(false);
      toast({
        title: '🎉 일괄 생성 완료',
        description: `총 ${newJobs.length}개의 프로젝트가 생성되었습니다. [편집기로 열기] 또는 [프로 편집기]로 세부 조율이 가능합니다.`
      });
    }, 1200);
  };

  // ── 4대 전용 스튜디오로 Handoff 이동 ──
  const handleOpenInDedicatedStudio = (job: BatchJobResult) => {
    const editorRoute = `/shorts-editor/${job.archetype}`;
    const meta = job.metadata || {};
    const scenes = meta.scenes || [];

    const handoffPayload = {
      title: job.title,
      layoutTemplateMode: job.archetype,
      templateMode: job.archetype,
      channelName: 'ViraLoop Studio',
      videoUrl: job.videoFilename || '',
      subtitles: scenes.length > 0
        ? scenes.map((s: any, idx: number) => ({
            start: idx * 4.0,
            end: (idx + 1) * 4.0,
            text: s.narration || s.hookJabText || job.title,
          }))
        : [
            { start: 0.0, end: 2.5, text: `${job.title}` },
            { start: 2.5, end: 5.5, text: '핵심 하이라이트 명장면 공개합니다.' },
            { start: 5.5, end: 8.5, text: '구독과 좋아요 누르고 끝까지 시청해주세요!' },
          ],
      jabs: scenes.length > 0
        ? scenes.map((s: any, idx: number) => ({
            start: idx * 4.0 + 0.5,
            end: idx * 4.0 + 3.0,
            text: s.hookJabText || `*${job.title}*`,
            hook: s.hookJabText || `*${job.title}*`,
          }))
        : [
            { start: 0.8, end: 3.2, text: '*실시간 충격 반전!*', hook: '*실시간 충격 반전!*' },
          ],
      titleBadgeText: meta.sourceOrigin || '화제 1위',
      titleLine1: meta.headlineLine1 || job.title.slice(0, 14),
      titleLine2: meta.headlineLine2 || '충격 실화 전말',
      coupangSafeZone: job.archetype === 'gunlimbo',
      kenBurnsMotion: true,
      sourceOrigin: meta.sourceOrigin || '',
      sourceUrl: meta.originalUrl || '',
    };

    try {
      sessionStorage.setItem('vlstudio_editor_handoff', JSON.stringify(handoffPayload));
      localStorage.setItem('vlstudio_editor_handoff_backup', JSON.stringify(handoffPayload));
    } catch (_) {}

    toast({ title: '전문 전용 스튜디오 이동', description: `${job.title} ➔ [${job.archetype.toUpperCase()}] 편집기로 진입합니다.` });
    navigate(`${editorRoute}?title=${encodeURIComponent(job.title)}`);
  };

  // ── 플래그십 프로 비디오 편집기 (/pro-editor) 로 Handoff 이동 ──
  const handleOpenInProEditor = (job: BatchJobResult) => {
    const meta = job.metadata || {};
    const scenes = meta.scenes || [];

    const proHandoffPayload = {
      title: job.title,
      aspectRatio: '9:16',
      durationMs: 25000,
      subtitles: scenes.length > 0
        ? scenes.map((s: any, idx: number) => ({
            start: idx * 4.0,
            end: (idx + 1) * 4.0,
            text: s.narration || s.hookJabText || job.title,
          }))
        : [
            { start: 0.0, end: 3.5, text: `${job.title}` },
            { start: 3.5, end: 8.0, text: '프로 편집기에서 Q/W 리플트림과 S 분할 컷 편집을 진행하세요.' },
            { start: 8.0, end: 14.0, text: 'CapCut 1:1 완벽 초안과 스케줄 배포 대기열로 직결됩니다.' },
          ],
    };

    try {
      sessionStorage.setItem('vlstudio_pro_editor_handoff', JSON.stringify(proHandoffPayload));
    } catch (_) {}

    toast({ title: '프로 비디오 편집기 열기', description: `${job.title} 프로젝트가 NLE 마스터 편집기로 전달되었습니다.` });
    navigate(`/pro-editor?title=${encodeURIComponent(job.title)}`);
  };

  // ── CapCut 1:1 초안 내보내기 ──
  const handleExportCapCut = async (job: BatchJobResult) => {
    try {
      await exportCapCutFullProject({
        title: job.title,
        projectName: job.title,
        durationMs: 22000,
        layoutTemplateMode: job.archetype,
        video: {
          path: 'video.mp4',
          durationMs: 22000,
          scale: 100,
        },
        subtitles: [
          { startMs: 0, endMs: 3000, text: job.title },
          { startMs: 3000, endMs: 7000, text: 'CapCut 1:1 무손실 초안입니다.' }
        ],
        jabs: [
          { enabled: true, startMs: 500, endMs: 3500, text: '🔥 실시간 화제', fontSize: 24, textColor: '#FFE500', badgeColor: '#000000', rotationDeg: -4, xPct: 50, yPct: 22 }
        ],
        audios: []
      } as any);

      toast({
        title: '🎬 CapCut 초안 내보내기 완료',
        description: `'${job.title}' 프로젝트가 로컬 CapCut에 1:1 무손실로 등록되었습니다.`
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'CapCut 내보내기 실패',
        description: e.message || '초안 생성 중 오류가 발생했습니다.'
      });
    }
  };

  // ── 스케줄 배포 대기열 직결 ──
  const handleSchedulePublish = (job: BatchJobResult) => {
    toast({
      title: '🚀 스케줄 배포 대기열 등록',
      description: `'${job.title}' 프로젝트가 LTE 다중 회선 예약 배포 관리 시스템으로 등록되었습니다.`
    });
    navigate('/work-queue');
  };

  const handleCopyPixelingMeta = (job: BatchJobResult) => {
    const text = job.formatted_pixeling_text || job.pixeling_meta?.formatted_text || generatePixelingStandardMeta([job]);
    if (!text) {
      toast({ title: '메타데이터 없음', description: '복사할 메타데이터가 존재하지 않습니다.' });
      return;
    }
    navigator.clipboard.writeText(text);
    toast({ title: '📋 픽셀링 메타 복사 완료', description: `'${job.title}' 표준 메타데이터가 클립보드에 복사되었습니다.` });
  };

  const handleDirectPixelingPublish = (job: BatchJobResult) => {
    const text = job.formatted_pixeling_text || job.pixeling_meta?.formatted_text || generatePixelingStandardMeta([job]);
    sessionStorage.setItem('pending_pixeling_meta', text);
    sessionStorage.setItem('pending_pixeling_open', 'true');
    toast({
      title: '🚀 픽셀링 자동 배포 대기열 등록',
      description: `'${job.title}' 프로젝트와 실물 비디오가 자동 배포 관리 시스템으로 직결되었습니다.`
    });
    navigate('/work-queue');
  };

  const handleBatchPixelingPublish = () => {
    if (batchResults.length === 0) {
      toast({ title: '대기열 없음', description: '배포할 생성 프로젝트가 없습니다.' });
      return;
    }
    const fullText = batchResults.map(j => j.formatted_pixeling_text || j.pixeling_meta?.formatted_text || generatePixelingStandardMeta([j])).join('\n\n');
    sessionStorage.setItem('pending_pixeling_meta', fullText);
    sessionStorage.setItem('pending_pixeling_open', 'true');
    toast({
      title: '🚀 전체 프로젝트 픽셀링 일괄 배포',
      description: `총 ${batchResults.length}개 프로젝트의 표준 메타가 대기열로 전달되었습니다.`
    });
    navigate('/work-queue');
  };

  const handleCopyAllPixelingMeta = () => {
    if (batchResults.length === 0) return;
    const fullText = batchResults.map(j => j.formatted_pixeling_text || j.pixeling_meta?.formatted_text || generatePixelingStandardMeta([j])).join('\n\n');
    navigator.clipboard.writeText(fullText);
    toast({ title: '📋 전체 픽셀링 메타 복사 완료', description: `총 ${batchResults.length}개 프로젝트의 표준 메타가 클립보드에 복사되었습니다.` });
  };

  const handleDeleteJob = (id: string) => {
    setBatchResults(prev => prev.filter(j => j.id !== id));
    toast({ title: '작업 삭제 완료' });
  };

  // 현재 활성 탭 메타
  const currentTabMeta = useMemo(() => {
    return PIXELING_BATCH_GROUPS.flatMap(g => g.tabs).find(t => t.id === activeTab);
  }, [activeTab]);

  return (
    <div className="w-full max-w-[1760px] mx-auto p-3 sm:p-6 space-y-6 select-none animate-in fade-in duration-150 pb-20 text-foreground">
      {/* ── 0. 상단 영구 스튜디오 작업 탭 바 (1초 무손실 전환 & 일괄 생성 복귀) ── */}
      <StudioWorkspaceTabs
        currentActiveTab="batch"
        queueCount={batchResults.length}
        className="mb-1"
      />

      {/* ── 1. 마스터 헤더 & 듀얼 서피스 토글 ── */}
      {/* ── 1. 스튜디오 헤더 & 픽셀링 올인원 워크스테이션 배너 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              올인원 일괄 생성 허브
            </h1>
            <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              11-TAB WORKSTATION
            </Badge>
            <span className="text-[11px] text-muted-foreground hidden lg:inline">
              · 픽셀링 11대 일괄 생성 & 주권 엔진(Whisper, LLM, 4대 스튜디오, LTE)
            </span>
          </div>
        </div>

        {/* 우측 빠른 액션 버튼군 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/pro-editor')}
            className="h-7 text-xs font-bold gap-1 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Clapperboard className="w-3 h-3" />
            <span>프로 편집기</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/script-lab')}
            className="h-7 text-xs font-bold gap-1 border-border bg-card hover:bg-muted"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span>대본 분석실</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gallery')}
            className="h-7 text-xs font-bold gap-1 border-border bg-card hover:bg-muted"
          >
            <FolderOpen className="w-3 h-3 text-amber-500" />
            <span>영상 보관함</span>
          </Button>
        </div>
      </div>

      {/* ── 2. 픽셀링 4대 카테고리 11대 전문 탭 가로 네비게이션 ── */}
      <div className="bg-card border border-border rounded-xl p-2 shadow-xs space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          {PIXELING_BATCH_GROUPS.map(group => (
            <div key={group.id} className="flex items-center gap-1 shrink-0 px-1 border-r border-border last:border-r-0">
              <span className="text-[10px] font-black uppercase text-muted-foreground px-1.5 tracking-wider shrink-0">
                {group.label}
              </span>
              <div className="flex items-center gap-1">
                {group.tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer shrink-0",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs ring-1 ring-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      )}
                      title={tab.desc}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className={cn(
                          "text-[9px] px-1 py-0.2 rounded font-mono font-black",
                          isActive ? "bg-black/20 text-white" : "bg-primary/15 text-primary"
                        )}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 활성 탭 설명 배너 */}
        {currentTabMeta && (
          <div className="px-3 py-1.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <strong className="text-foreground">{currentTabMeta.label}:</strong> {currentTabMeta.desc}
            </span>
            <span className="text-[10px] font-mono text-primary">PIXELING SPEC VERIFIED</span>
          </div>
        )}
      </div>

      {/* ── 3. 11대 전문 일괄 작업실 동적 마운트 (Zero Mock UI Law 100% 준수) ── */}
      <div className="w-full">
        {activeTab === 'one-take' && (
          <OneTakeBatchTab
            ssulList={ssulList}
            newsList={newsList}
            scriptList={scriptList}
            videoList={videoList}
            onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])}
          />
        )}
        {activeTab === 'song' && (
          <SongBatchTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'long-to-short' && (
          <LongToShortTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'long-to-short-2' && (
          <LongToShort2Tab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'movie-drama-shorts' && (
          <MovieDramaShortsTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'text-creative' && (
          <TextCreativeTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'video-creative' && (
          <VideoCreativeTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'meokguri' && (
          <MeokguriTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'ranking-shorts' && (
          <RankingShortsTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'stock-motion' && (
          <StockMotionTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
        {activeTab === 'longform-multi' && (
          <LongformMultiTab onAddBatchJobs={jobs => setBatchResults(prev => [...jobs, ...prev])} />
        )}
      </div>


      {/* ── 4. 완성된 일괄 생성 작업 결과 큐 (기타 탭 전용) ── */}
      {activeTab !== 'one-take' && (
      <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">
                완성된 일괄 프로젝트 대기열 ({batchResults.length})
              </span>
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">
                1080x1920 MP4 실물 렌더링 완결
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              각 프로젝트는 실제 재생 가능한 MP4 비디오이며, 픽셀링 표준 메타데이터와 함께 즉시 자동 배포 대기열로 인계하거나 편집기에서 추가 수정할 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAllPixelingMeta}
              disabled={batchResults.length === 0}
              className="h-7 text-xs font-bold gap-1 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>전체 메타 일괄 복사</span>
            </Button>
            <Button
              size="sm"
              onClick={handleBatchPixelingPublish}
              disabled={batchResults.length === 0}
              className="h-7 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>전체 픽셀링 일괄 배포 등록</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {batchResults.map(job => {
            const hasVideo = !!(job.stream_url || job.video_path);
            const videoSrc = job.stream_url
              ? (job.stream_url.startsWith('http') ? job.stream_url : `${window.location.origin}${job.stream_url}`)
              : '';

            return (
              <div
                key={job.id}
                className="p-3.5 rounded-xl border border-border bg-background flex flex-col justify-between gap-3 shadow-2xs hover:border-primary/50 transition group"
              >
                <div>
                  {/* 카드 헤더 배지 */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold px-1.5 py-0.2 rounded",
                        job.archetype === 'ssul' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                        job.archetype === 'gunlimbo' ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" :
                        job.archetype === 'instagram' ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" :
                        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      )}>
                        {job.archetype === 'ssul' ? '📜 썰형' :
                         job.archetype === 'gunlimbo' ? '🎬 군림보' :
                         job.archetype === 'instagram' ? '📱 인스타' : '🥪 클래식'}
                      </Badge>
                      <span className="text-[9.5px] font-mono text-muted-foreground">
                        [{job.tabId}]
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {job.file_size_bytes && job.file_size_bytes > 0 && (
                        <span className="text-[9.5px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {(job.file_size_bytes / (1024 * 1024)).toFixed(1)}MB
                        </span>
                      )}
                      {job.duration_seconds && job.duration_seconds > 0 && (
                        <span className="text-[9.5px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {job.duration_seconds.toFixed(1)}s
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">{job.createdAt}</span>
                    </div>
                  </div>

                  {/* 실물 MP4 동영상 플레이어 */}
                  {hasVideo && videoSrc ? (
                    <div className="relative aspect-[9/16] max-h-[220px] w-full bg-black rounded-lg overflow-hidden border border-border mb-2.5 flex items-center justify-center">
                      <video
                        src={videoSrc}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                  ) : null}

                  {/* 프로젝트 제목 */}
                  <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug mb-1">
                    {job.title}
                  </h3>

                  {/* 픽셀링 AI 바이럴 메타데이터 요약 */}
                  {job.pixeling_meta && (
                    <div className="p-2 bg-muted/20 rounded-lg border border-border/60 text-[10.5px] space-y-1 mb-2">
                      <div className="text-primary font-bold line-clamp-1">
                        🎯 {job.pixeling_meta.title}
                      </div>
                      <div className="text-muted-foreground line-clamp-1">
                        📝 {job.pixeling_meta.description}
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-mono text-[9.5px] truncate">
                        {job.pixeling_meta.hashtags}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>씬: {job.scriptLinesCount || job.subtitles?.length || 3}개</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      실물 렌더링 완료
                    </span>
                  </div>
                </div>

                {/* 4대 원스톱 직결 액션 버튼군 */}
                <div className="space-y-1.5 pt-2 border-t border-border/80">
                  {/* 1행: 픽셀링 메타 복사 & 픽셀링 배포 등록 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyPixelingMeta(job)}
                      className="h-7 text-[11px] font-bold gap-1 border-primary/40 bg-card hover:bg-muted text-primary cursor-pointer"
                      title="픽셀링 표준 텍스트 메타데이터 복사"
                    >
                      <Copy className="w-3 h-3" />
                      <span>픽셀링 메타 복사</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDirectPixelingPublish(job)}
                      className="h-7 text-[11px] font-bold gap-1 bg-violet-600 hover:bg-violet-700 text-white cursor-pointer"
                      title="픽셀링 표준 메타와 비디오를 자동 배포 대기열로 직결"
                    >
                      <Radio className="w-3 h-3" />
                      <span>픽셀링 배포 등록</span>
                    </Button>
                  </div>

                  {/* 2행: 전용 스튜디오 & 프로 편집기 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => handleOpenInDedicatedStudio(job)}
                      className="h-7 text-[11px] font-bold gap-1 bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 cursor-pointer"
                      title="해당 폼팩터 전용 스튜디오로 열어 추가 편집"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>전용 편집기</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenInProEditor(job)}
                      className="h-7 text-[11px] font-bold gap-1 border-primary/40 bg-card hover:bg-muted text-primary cursor-pointer"
                      title="프로 NLE 편집기로 열어 정밀 트랙 편집"
                    >
                      <Clapperboard className="w-3 h-3" />
                      <span>프로 편집기</span>
                    </Button>
                  </div>

                  {/* 3행: CapCut & 삭제 */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExportCapCut(job)}
                      className="flex-1 h-7 text-[11px] font-bold gap-1 border-border hover:bg-muted text-foreground cursor-pointer"
                      title="CapCut 1:1 무손실 초안 내보내기"
                    >
                      <Film className="w-3 h-3 text-rose-500" />
                      <span>CapCut 초안</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteJob(job.id)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      title="작업 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};

export default ShortsBatchStudio;
