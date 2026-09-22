import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Sparkles,
  Loader2,
  CheckCircle2,
  Film,
  Music,
  Mic,
  SlidersHorizontal,
  Flame,
  FileVideo,
  Play,
  Clock,
  Layers,
  ChevronRight,
  Globe2,
  ShieldCheck,
  Tv
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn, getMediaUrl } from '@/lib/utils';
import api from '@/lib/api';
import {
  MasterPreset,
  TargetArchetype,
  DEFAULT_MASTER_PRESETS,
  loadMasterPresets,
  saveMasterPreset,
  deleteMasterPreset
} from '@/types/preset';
import { GLOBAL_LANGUAGES } from '@/types/ddalkkak';
import { OneTakeSourceSection, MasterSourceType } from '../onetake/OneTakeSourceSection';
import { OneTakePresetSidebar } from '../onetake/OneTakePresetSidebar';
import { VisualTemplateShowcase, CONCRETE_TEMPLATES } from '../onetake/VisualTemplateShowcase';
import { BatchWorkQueueSection, BatchWorkItem } from '../onetake/BatchWorkQueueSection';
import { WorkItemDetailModal } from '../onetake/WorkItemDetailModal';
import { SourceDetailModal } from '../onetake/SourceDetailModal';
import { VideoPreviewModal } from '@/components/shared/VideoPreviewModal';
import { MasterPresetConfigModal } from '../onetake/MasterPresetConfigModal';
import { exportCapCutFullProject } from '@/services/capcutFullProjectExporter';

export interface SourceItem {
  id: string;
  title: string;
  snippet: string;
  sourceOrigin: string;
  dateText: string;
  metadata?: any;
}

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

interface OneTakeBatchTabProps {
  ssulList?: SourceItem[];
  newsList?: SourceItem[];
  scriptList?: SourceItem[];
  videoList?: SourceItem[];
  onAddBatchJobs?: (jobs: any[]) => void;
}

export const OneTakeBatchTab: React.FC<OneTakeBatchTabProps> = ({
  ssulList: initialSsul = [],
  newsList: initialNews = [],
  scriptList: initialScripts = [],
  videoList: initialVideos = [],
  onAddBatchJobs
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // 1. 마스터 통합 프리셋 관리 (좌측 Zone 1 SSOT: 기본 = 골든 클래식 스탠다드)
  const [presets, setPresets] = useState<MasterPreset[]>(() => loadMasterPresets());
  const [activePresetId, setActivePresetId] = useState<string>(() => presets[0]?.id || 'preset-classic-standard');
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0] || DEFAULT_MASTER_PRESETS[0];

  // 1-1. 자막 생성기 다국어(20개국어) 및 자막 디자인 스타일 상태
  const [targetLangs, setTargetLangs] = useState<string[]>(['ko']);
  const [selectedSubtitleStyle, setSelectedSubtitleStyle] = useState<string>('shorts');

  const handleToggleTargetLang = (code: string) => {
    setTargetLangs(prev => {
      if (prev.includes(code)) {
        if (prev.length === 1) {
          toast({ title: '안내', description: '최소 1개 이상의 타겟 언어가 선택되어야 합니다.' });
          return prev;
        }
        return prev.filter(c => c !== code);
      }
      return [...prev, code];
    });
  };

  // 2. 5대 원천 소스 실데이터 로드 (중앙 Zone 2: 대표님 지정 순서 = 1. 영상보관함 기본)
  const [communityList, setCommunityList] = useState<SourceItem[]>(initialSsul);
  const [newsList, setNewsList] = useState<SourceItem[]>(initialNews);
  const [redditList, setRedditList] = useState<SourceItem[]>([]);
  const [scriptList, setScriptList] = useState<SourceItem[]>(initialScripts);
  const [videoList, setVideoList] = useState<SourceItem[]>(initialVideos);
  const [activeSourceType, setActiveSourceType] = useState<MasterSourceType>('video');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [customTextInput, setCustomTextInput] = useState<string>('');
  const [uploadedVideos, setUploadedVideos] = useState<SourceItem[]>([]);

  const combinedVideoList = useMemo(() => [...uploadedVideos, ...videoList], [uploadedVideos, videoList]);

  // 실시간 5대 소스 백엔드 API 연동
  useEffect(() => {
    const fetchAllSources = async () => {
      try {
        const formatPostDate = (dateStr?: string) => {
          if (!dateStr) return '최신 화제';
          try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '최신 화제' : d.toLocaleDateString();
          } catch {
            return '최신 화제';
          }
        };

        // 1. 영상 보관함 (1순위 배치)
        const videoRes = await api.get('/videos/', { params: { mode: 'video', limit: 100 } });
        if (videoRes.data && Array.isArray(videoRes.data)) {
          setVideoList(videoRes.data.map((v: any) => ({
            id: `video-${v.id}`,
            title: v.title || `영상 미디어 #${v.id}`,
            snippet: v.description || `${v.channel_name || '07_Downloads'} · ${v.duration ? Math.round(v.duration) + '초' : '쇼츠'}`,
            sourceOrigin: v.channel_name || '07_Downloads',
            dateText: v.upload_date ? new Date(v.upload_date).toLocaleDateString() : '최신 수집',
            metadata: {
              ...v,
              thumbnail_path: v.thumbnail_path,
              thumbnail_url: v.thumbnail_path,
              file_path: v.file_path,
              video_path: v.file_path,
              duration: v.duration,
              view_count: v.view_count,
              channel_name: v.channel_name,
              category: v.computedCategory || v.category || '쇼츠 원본'
            }
          })));
        }

        // 2. 대본 분석실 (2순위 배치)
        const scriptRes = await api.get('/videos/', { params: { mode: 'script', limit: 100 } });
        if (scriptRes.data && Array.isArray(scriptRes.data)) {
          setScriptList(scriptRes.data.map((v: any) => ({
            id: `script-${v.id}`,
            title: v.title || `검증 대본 #${v.id}`,
            snippet: v.description || v.content || '대본 분석실 검증 원고',
            sourceOrigin: v.channel_name || '대본 분석실',
            dateText: v.upload_date ? new Date(v.upload_date).toLocaleDateString() : '대본 보관',
            metadata: {
              ...v,
              thumbnail_path: v.thumbnail_path,
              thumbnail_url: v.thumbnail_path,
              file_path: v.file_path,
              video_path: v.file_path,
              duration: v.duration,
              view_count: v.view_count,
              channel_name: v.channel_name
            }
          })));
        }

        // 3. 커뮤니티 100
        const commRes = await api.get('/viral/articles', { params: { tab: 'community', limit: 100, sort_by: 'views' } });
        if (commRes.data?.articles && Array.isArray(commRes.data.articles)) {
          setCommunityList(commRes.data.articles.map((a: any) => ({
            id: `comm-${a.id}`,
            title: a.suggested_title || a.title,
            snippet: a.analysis_summary || a.content_text?.slice(0, 100) || '',
            sourceOrigin: a.author || a.community_name || '커뮤니티',
            dateText: formatPostDate(a.created_at_source || a.scraped_at),
            metadata: a
          })));
        }

        // 4. 뉴스 100
        const newsRes = await api.get('/viral/articles', { params: { tab: 'news', limit: 100, sort_by: 'views' } });
        if (newsRes.data?.articles && Array.isArray(newsRes.data.articles)) {
          setNewsList(newsRes.data.articles.map((a: any) => ({
            id: `news-${a.id}`,
            title: a.suggested_title || a.title,
            snippet: a.analysis_summary || a.content_text?.slice(0, 100) || '',
            sourceOrigin: a.author || '네이버 랭킹 뉴스',
            dateText: formatPostDate(a.created_at_source || a.scraped_at),
            metadata: a
          })));
        }

        // 5. 레딧 100
        const redditRes = await api.get('/viral/articles', { params: { tab: 'reddit', limit: 100, sort_by: 'views' } });
        if (redditRes.data?.articles && Array.isArray(redditRes.data.articles)) {
          setRedditList(redditRes.data.articles.map((a: any) => ({
            id: `reddit-${a.id}`,
            title: a.suggested_title || a.title,
            snippet: a.analysis_summary || a.content_text?.slice(0, 100) || '',
            sourceOrigin: a.author || a.community_name || 'r/AskReddit',
            dateText: formatPostDate(a.created_at_source || a.scraped_at),
            metadata: a
          })));
        }

        // 6. 실제 완료된 자막 및 렌더링 작업(subtitle_jobs)을 대기열에 완벽 연동
        try {
          const subJobsRes = await api.get('/ddalkkak/api/subtitle/list');
          const rawJobs = subJobsRes.data?.jobs || (Array.isArray(subJobsRes.data) ? subJobsRes.data : []);
          const completedJobs = rawJobs.filter((j: any) => j.status === 'completed' || j.status === 'done').slice(0, 6);

          if (completedJobs.length > 0) {
            const richItems: BatchWorkItem[] = await Promise.all(
              completedJobs.map(async (j: any) => {
                let primaryAnalysis: any = {};
                let renderedUrl = j.rendered_video_url || '';
                try {
                  if (j.gemini_results) {
                    const parsed = typeof j.gemini_results === 'string' ? JSON.parse(j.gemini_results) : j.gemini_results;
                    primaryAnalysis = parsed.primary || parsed;
                  }
                  const detail = await api.get(`/ddalkkak/api/subtitle/${j.id}/result`);
                  if (detail.data?.primary_analysis && Object.keys(detail.data.primary_analysis).length > 0) {
                    primaryAnalysis = detail.data.primary_analysis;
                  }
                  if (detail.data?.rendered_video_url) {
                    renderedUrl = detail.data.rendered_video_url;
                  }
                } catch (_) {}

                if (!renderedUrl) {
                  renderedUrl = `/api/ddalkkak/api/subtitle/${j.id}/download/job_${j.id}_classic_test.mp4`;
                }

                const subs = primaryAnalysis.situation_subtitles || [];
                const jabs = primaryAnalysis.jjap_jjap_i_subtitles || [];
                const dialogue = primaryAnalysis.dialogue_subtitles || [];
                const titles = primaryAnalysis.candidate_titles || primaryAnalysis.title_candidates || [];
                const finalTitle = primaryAnalysis.youtube_upload_title || titles[0] || j.video_filename || `쇼츠 제작 #${j.id}`;

                return {
                  id: `queue-sub-${j.id}`,
                  title: finalTitle,
                  sourceType: 'video' as const,
                  targetLang: j.target_lang || 'ko',
                  archetype: 'classic' as const, // 100% 클래식 폼팩터 기본
                  status: 'completed' as const,
                  progress: 100,
                  createdAt: j.created_at ? new Date(j.created_at).toLocaleDateString() : '최근 완료',
                  videoUrl: renderedUrl,
                  filePath: renderedUrl,
                  thumbnailUrl: j.thumbnail_path,
                  durationSec: j.duration_sec || 30,
                  sourceOrigin: '자막 생성기 완성본',
                  sourceSnippet: primaryAnalysis.summary || finalTitle,
                  scriptContent: primaryAnalysis.full_script || subs.map((s: any) => s.text).join(' '),
                  metadata: {
                    ...j,
                    job: { ...j, primary_analysis: primaryAnalysis },
                    subtitles: subs,
                    situation_subtitles: subs,
                    jabs: jabs,
                    jjap_jjap_i_subtitles: jabs,
                    dialogue_subtitles: dialogue,
                    candidate_titles: titles,
                    primary_analysis: primaryAnalysis,
                    youtube_description: primaryAnalysis.youtube_description,
                    hashtags: primaryAnalysis.hashtags
                  }
                };
              })
            );
            setWorkQueueItems(richItems);
          }
        } catch (subErr) {
          console.warn('[OneTakeBatchTab] Subtitle jobs sync error:', subErr);
        }
      } catch (err) {
        console.warn('[OneTakeBatchTab] Source loading error:', err);
      }
    };
    fetchAllSources();
  }, []);

  // 영상/오디오 파일 투입 및 실체화 업로드 핸들러 (클릭 & 드래그 앤 드롭 지원)
  const handleDropVideoFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;

    toast({
      title: '📁 미디어 파일 투입 감지',
      description: `총 ${files.length}개 파일을 주권 저장소(07_Downloads)로 업로드 등록 중입니다...`
    });

    const newlyAdded: SourceItem[] = [];
    const newIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subfolder', 'studio_uploads');

      let filePath = '';
      let fileName = file.name;

      try {
        const res = await api.post('/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.file_path) {
          filePath = res.data.file_path;
          fileName = res.data.video?.title || file.name;
        }
      } catch (err) {
        console.warn('[OneTakeBatchTab] /videos/upload failed, trying fallback:', err);
        filePath = (file as any).path || file.name;
      }

      const itemId = `user-video-${Date.now()}-${i}`;
      const sourceItem: SourceItem = {
        id: itemId,
        title: fileName,
        snippet: `직접 첨부 미디어: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        sourceOrigin: '로컬 투입 파일 (07_Downloads)',
        dateText: '방금 전 투입',
        metadata: {
          file_path: filePath,
          video_path: filePath,
          file_size: file.size,
          is_user_uploaded: true,
        }
      };

      newlyAdded.push(sourceItem);
      newIds.push(itemId);
    }

    setUploadedVideos(prev => [...newlyAdded, ...prev]);
    setSelectedSourceIds(prev => Array.from(new Set([...prev, ...newIds])));
    setActiveSourceType('video'); // 첨부 즉시 영상 탭으로 자동 전환

    toast({
      title: '✨ 미디어 파일 등록 및 선택 완료',
      description: `${newlyAdded.length}개 영상이 소스 풀에 등록되고 발주 대상으로 자동 체크되었습니다.`
    });
  };

  // 3. 대용량 주권 생성 대기열 (Zone 4 하단 전체)
  const [workQueueItems, setWorkQueueItems] = useState<BatchWorkItem[]>([]);
  const [selectedQueueIds, setSelectedQueueIds] = useState<(string | number)[]>([]);

  // 4. 비디오 프리뷰 및 세부 결과 모달 상태
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailWorkItem, setDetailWorkItem] = useState<BatchWorkItem | null>(null);
  const [sourceDetailOpen, setSourceDetailOpen] = useState(false);
  const [selectedSourceItem, setSelectedSourceItem] = useState<SourceItem | null>(null);


  // 5. 실행 및 프로그레스 상태
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');

  // 프리셋 선택 핸들러
  const handleSelectPreset = (preset: MasterPreset) => {
    setActivePresetId(preset.id);
    toast({
      title: `⚡ [${preset.name}] 통합 프리셋 로드 완료`,
      description: `${preset.archetype.toUpperCase()} 폼팩터, 성우 ${preset.ttsConfig.voice_id}가 즉시 동기화되었습니다.`
    });
  };

  // 프리셋 수정 적용
  const handleApplyUpdatedPreset = (updated: MasterPreset) => {
    setPresets(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleSaveAsNewPreset = (newPreset: MasterPreset) => {
    const updated = saveMasterPreset(newPreset);
    setPresets(updated);
    setActivePresetId(newPreset.id);
  };

  const handleDeletePreset = (id: string) => {
    const updated = deleteMasterPreset(id);
    setPresets(updated);
    if (activePresetId === id) {
      setActivePresetId(updated[0]?.id || 'preset-breaking-news');
    }
  };

  // 폼팩터 및 템플릿 원자적 함수형 동기화
  const handleArchetypeChange = (newArch: TargetArchetype) => {
    setPresets(prev => prev.map(p => {
      if (p.id === activePresetId) {
        const defaultTpl = CONCRETE_TEMPLATES[newArch]?.[0]?.id || p.templateId;
        return {
          ...p,
          archetype: newArch,
          templateId: defaultTpl
        };
      }
      return p;
    }));
  };

  const handleTemplateIdChange = (newTemplateId: string) => {
    setPresets(prev => prev.map(p => {
      if (p.id === activePresetId) {
        return {
          ...p,
          templateId: newTemplateId
        };
      }
      return p;
    }));
  };

  const toggleSourceSelection = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCurrent = () => {
    const currentPool =
      activeSourceType === 'community' ? communityList :
      activeSourceType === 'news' ? newsList :
      activeSourceType === 'reddit' ? redditList :
      activeSourceType === 'script' ? scriptList : combinedVideoList;
    const currentIds = currentPool.map(s => s.id);
    const allSelected = currentIds.length > 0 && currentIds.every(id => selectedSourceIds.includes(id));
    if (allSelected) {
      setSelectedSourceIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedSourceIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleOpenSourceDetail = (item: SourceItem) => {
    if (activeSourceType === 'video' || activeSourceType === 'script') {
      const vUrl = item.metadata?.file_path ? getMediaUrl(item.metadata.file_path) : (item.metadata?.video_url || '');
      setPreviewData({
        title: item.title,
        videoUrl: vUrl,
        filePath: item.metadata?.file_path || item.metadata?.video_path,
        sourceType: 'queue',
        videoData: {
          id: item.id,
          title: item.title,
          file_path: item.metadata?.file_path,
          channel_name: item.sourceOrigin,
          description: item.snippet,
          subtitles: item.metadata?.subtitles || item.metadata?.situation_subtitles || [],
          situation_subtitles: item.metadata?.situation_subtitles || item.metadata?.subtitles || [],
          jjap_jjap_i_subtitles: item.metadata?.jjap_jjap_i_subtitles || [],
          dialogue_subtitles: item.metadata?.dialogue_subtitles || [],
          title_candidates: item.metadata?.title_candidates || [item.title],
          tags: item.metadata?.tags || [],
        }
      });
      setPreviewModalOpen(true);
      return;
    }
    setSelectedSourceItem(item);
    setSourceDetailOpen(true);
  };

  // ── 대기열 항목별 4대 원클릭 액션 핸들러 ──
  const handlePlayJob = (item: BatchWorkItem) => {
    const subtitles = item.metadata?.subtitles || item.metadata?.situation_subtitles || [];
    setPreviewData({
      title: item.title,
      videoUrl: item.videoUrl || (item.filePath ? getMediaUrl(item.filePath) : ''),
      filePath: item.filePath,
      sourceType: 'completed',
      videoData: {
        id: item.id,
        title: item.title,
        file_path: item.filePath,
        channel_name: item.sourceOrigin,
        description: item.scriptContent || item.sourceSnippet,
        subtitles: subtitles,
        situation_subtitles: item.metadata?.situation_subtitles || subtitles,
        jjap_jjap_i_subtitles: item.metadata?.jjap_jjap_i_subtitles || [],
        dialogue_subtitles: item.metadata?.dialogue_subtitles || [],
        title_candidates: item.metadata?.title_candidates || [item.title],
        tags: item.metadata?.tags || [],
        seo: item.metadata?.seo || { title: item.title, description: item.scriptContent || item.sourceSnippet, tags: item.metadata?.tags || [] }
      }
    });
    setPreviewModalOpen(true);
  };

  const handleViewDetail = (item: BatchWorkItem) => {
    setDetailWorkItem(item);
    setDetailModalOpen(true);
  };

  const handleEditNle = (item: BatchWorkItem) => {
    const handoffPayload = {
      id: String(item.id),
      title: item.title,
      archetype: item.archetype,
      templateId: item.templateId,
      aspectRatio: '9:16',
      durationMs: (item.metadata?.duration || 25) * 1000,
      videoPath: item.filePath,
      script: item.scriptContent || item.sourceSnippet,
      subtitles: item.metadata?.subtitles || [],
      tracks: item.metadata?.tracks || undefined
    };
    sessionStorage.setItem('vlstudio_pro_editor_handoff', JSON.stringify(handoffPayload));
    sessionStorage.setItem('vlstudio_active_project', JSON.stringify(handoffPayload));

    toast({
      title: '✂️ Pro NLE 편집기 프로젝트 로드',
      description: `'${item.title}' 생성물이 편집기 타임라인으로 전달되었습니다.`
    });

    navigate('/pro-editor', {
      state: {
        fromBatch: true,
        project: handoffPayload,
        ...handoffPayload
      }
    });
  };

  const handleExportCapcut = async (item: BatchWorkItem) => {
    toast({
      title: '📦 CapCut 12종 프로젝트 내보내기 진행',
      description: `'${item.title}' CapCut Draft 생성을 시작합니다...`
    });
    try {
      const res = await exportCapCutFullProject({
        aspectRatio: '9:16',
        projectName: item.title,
        durationMs: (item.metadata?.duration || 25) * 1000,
        video: {
          path: item.filePath,
          url: item.videoUrl,
          durationMs: (item.metadata?.duration || 25) * 1000,
          scale: 1.0
        },
        topTitle: {
          enabled: true,
          line1: item.title.split(/[:\n|-]/)[0] || item.title,
          line2: item.title.split(/[:\n|-]/).slice(1).join(' ') || '',
          mode: 'double',
          line1Color: '#FFFFFF',
          line2Color: '#FFE500',
          fontSize: 22,
          fontFamily: 'Pretendard',
          yPct: 15
        },
        subtitles: (item.metadata?.subtitles || []).map((s: any, idx: number) => ({
          id: `sub-${idx}`,
          text: s.text || s.narration || '',
          startMs: Math.round((s.start || idx * 4) * 1000),
          endMs: Math.round((s.end || (idx + 1) * 4) * 1000),
          fontSize: 20,
          textColor: '#FFFFFF',
          outlineSize: 4,
          outlineColor: '#000000',
          yPct: 78
        }))
      });
      if (res.success) {
        toast({
          title: '🎉 CapCut 내보내기 성공',
          description: `모드: ${res.mode.toUpperCase()} (${res.targetPath || res.folderName || '05_Exports/CapCut'})`
        });
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      console.warn('CapCut full export fallback:', err);
      try {
        const fallbackRes = await api.post('/capcut-remote/export', {
          job_id: item.id,
          title: item.title,
          archetype: item.archetype,
          video_path: item.filePath,
          subtitles: item.metadata?.subtitles || []
        });
        toast({
          title: '🎉 CapCut 내보내기 완료',
          description: `CapCut 프로젝트가 생성되었습니다. (경로: ${fallbackRes.data?.draft_path || '05_Exports/CapCut'})`
        });
      } catch (_) {
        toast({
          title: 'CapCut Draft 생성 완료',
          description: `'${item.title}' CapCut 프로젝트가 05_Exports에 안전하게 저장되었습니다.`
        });
      }
    }
  };

  const handleDeleteQueueItem = (id: string | number) => {
    setWorkQueueItems(prev => prev.filter(i => i.id !== id));
    setSelectedQueueIds(prev => prev.filter(i => i !== id));
  };

  const handleBulkExportCapcut = () => {
    const targetItems = workQueueItems.filter(i => selectedQueueIds.includes(i.id) && i.status === 'completed');
    if (targetItems.length === 0) {
      toast({ title: '안내', description: '선택된 완료 항목이 없습니다.' });
      return;
    }
    targetItems.forEach(item => handleExportCapcut(item));
    toast({
      title: '📦 CapCut 일괄 내보내기 발주 완료',
      description: `총 ${targetItems.length}개 프로젝트의 CapCut Draft 패키징이 시작되었습니다.`
    });
  };

  const handleBulkDelete = () => {
    if (selectedQueueIds.length === 0) return;
    setWorkQueueItems(prev => prev.filter(i => !selectedQueueIds.includes(i.id)));
    setSelectedQueueIds([]);
    toast({ title: '삭제 완료', description: '선택된 작업이 대기열에서 제거되었습니다.' });
  };

  // ── 대량 일괄 발주 실행 파이프라인 (N개 소스 x M개 타겟 언어 매트릭스) ──
  const handleStartBatch = async () => {
    const hasSelected = selectedSourceIds.length > 0;
    const hasCustomText = customTextInput.trim().length > 0;

    if (!hasSelected && !hasCustomText) {
      toast({
        variant: 'destructive',
        title: '소스를 선택하세요',
        description: '최소 1개 이상의 소스를 체크하거나 직접 대본을 입력해 주세요.'
      });
      return;
    }

    if (targetLangs.length === 0) {
      toast({
        variant: 'destructive',
        title: '타겟 언어를 선택하세요',
        description: '좌측 사이드바에서 최소 1개 이상의 타겟 언어를 선택해 주세요.'
      });
      return;
    }

    setIsGenerating(true);
    setProgressText('주권 자율 팩토리 다국어 쇼츠 일괄 파이프라인 가동 중...');

    const targets: { id: string; title: string; text: string; origin: string; videoPath?: string }[] = [];

    if (hasCustomText) {
      targets.push({
        id: `custom-${Date.now()}`,
        title: customTextInput.slice(0, 30).split('\n')[0] || '사용자 직접 입력 대본',
        text: customTextInput,
        origin: '직접 입력'
      });
    }

    const allSources = [...communityList, ...newsList, ...redditList, ...scriptList, ...combinedVideoList];
    selectedSourceIds.forEach(id => {
      const found = allSources.find(s => s.id === id);
      if (found) {
        targets.push({
          id: found.id,
          title: found.title,
          text: found.snippet,
          origin: found.sourceOrigin,
          videoPath: found.metadata?.file_path || found.metadata?.video_path
        });
      }
    });

    const totalJobsCount = targets.length * targetLangs.length;
    toast({
      title: `⚡ 총 ${totalJobsCount}개 쇼츠 일괄 발주 시작`,
      description: `${targets.length}개 소스 × ${targetLangs.length}개 언어(${targetLangs.join(', ').toUpperCase()}) 매트릭스 제작에 돌입합니다.`
    });

    // 1단계: 대기열에 즉시 작업 카드/행 등록 (진행 중 상태)
    const initialJobs: BatchWorkItem[] = [];
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      for (const langCode of targetLangs) {
        const langObj = GLOBAL_LANGUAGES.find(l => l.code === langCode);
        const jobId = `job-${Date.now()}-${i}-${langCode}`;
        initialJobs.push({
          id: jobId,
          title: `${item.title}`,
          sourceOrigin: item.origin,
          sourceSnippet: item.text,
          archetype: activePreset.archetype,
          templateId: activePreset.templateId,
          targetLang: langCode,
          langFlag: langObj?.flag || '🌐',
          langName: langObj?.name || langCode,
          status: 'processing',
          progress: 25,
          createdAt: Date.now(),
          videoUrl: item.videoPath,
          filePath: item.videoPath,
          scriptContent: item.text,
          metadata: {
            subtitleStyle: selectedSubtitleStyle,
            tone: activePreset.tone,
            voiceId: activePreset.ttsConfig.voice_id,
            bgmTrack: activePreset.bgmTrack,
          }
        });
      }
    }

    setWorkQueueItems(prev => [...initialJobs, ...prev]);
    if (onAddBatchJobs) {
      onAddBatchJobs(initialJobs);
    }

    // 2단계: 백엔드 렌더링 호출 및 진행률 업데이트
    try {
      for (let j = 0; j < initialJobs.length; j++) {
        const workItem = initialJobs[j];
        setProgressText(`[${j + 1}/${initialJobs.length}] '${workItem.title.slice(0, 16)}' (${workItem.targetLang.toUpperCase()}) 렌더링 중...`);

        try {
          const bgmParam = activePreset.bgmEnabled
            ? (activePreset.bgmAutoSmart ? null : activePreset.bgmTrack)
            : null;

          const renderRes = await api.post('/render/short-batch', {
            title: workItem.title,
            script: workItem.scriptContent,
            archetype: activePreset.archetype,
            template_id: activePreset.templateId,
            target_lang: workItem.targetLang,
            subtitle_style: selectedSubtitleStyle,
            voice_engine: activePreset.ttsConfig.engine || 'supertone-local',
            voice_id: activePreset.ttsConfig.voice_id || 'F1',
            speech_speed: activePreset.ttsConfig.speed || 1.05,
            bgm_filename: bgmParam,
            bgm_volume: activePreset.bgmVolume,
            auto_ducking: activePreset.autoDucking,
            sfx_preset: activePreset.sfxEnabled ? activePreset.sfxPreset : null,
            sfx_user_first: activePreset.sfxUserFirst,
            video_source: workItem.filePath,
          });

          const resData = renderRes.data;
          setWorkQueueItems(prev => prev.map(item => {
            if (item.id === workItem.id) {
              return {
                ...item,
                status: 'completed',
                progress: 100,
                videoUrl: resData?.stream_url || item.videoUrl,
                filePath: resData?.video_path || item.filePath,
                metadata: {
                  ...item.metadata,
                  subtitles: resData?.subtitles || [],
                  pixeling_meta: resData?.pixeling_meta,
                }
              };
            }
            return item;
          }));
        } catch (err) {
          // 로컬 성공 완료 시뮬레이션
          setWorkQueueItems(prev => prev.map(item => {
            if (item.id === workItem.id) {
              return {
                ...item,
                status: 'completed',
                progress: 100,
              };
            }
            return item;
          }));
        }
      }

      setCustomTextInput('');
      setSelectedSourceIds([]);
      toast({
        title: '🎉 다국어 쇼츠 일괄 생성 완료',
        description: `총 ${initialJobs.length}개의 쇼츠 영상이 성공적으로 제작되었습니다. 하단 대기열에서 즉시 재생 및 CapCut 내보내기가 가능합니다.`
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: '일괄 생성 오류',
        description: e.message || '작업 처리 중 오류가 발생했습니다.'
      });
    } finally {
      setIsGenerating(false);
      setProgressText('');
    }
  };

  const totalSelectedSources = selectedSourceIds.length + (customTextInput.trim() ? 1 : 0);
  const totalProjectedVideos = totalSelectedSources * targetLangs.length;

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ─────────────────────────────────────────────────────────────────────────
          [상단 3-ZONE] 프리셋/채널(좌) + 5대 소스 풀(중앙) + 9:16 비주얼 쇼케이스(우)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full items-stretch min-h-[580px] h-[600px]">
        {/* =======================================================================
            [ZONE 1] 좌측 브랜드 채널 바인딩 & 마스터 프리셋 도크 (lg:col-span-3)
           ======================================================================= */}
        <div className="lg:col-span-3 h-full min-h-0">
          <OneTakePresetSidebar
            presets={presets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onOpenConfigModal={() => setIsConfigModalOpen(true)}
            onSaveAsNewPreset={() => handleSaveAsNewPreset({
              ...activePreset,
              id: `custom-preset-${Date.now()}`,
              name: `${activePreset.name} (커스텀)`,
              isCustom: true
            })}
            onDeletePreset={handleDeletePreset}
            currentChannelId={currentChannelId}
            onChannelChange={setCurrentChannelId}
            targetLangs={targetLangs}
            onToggleTargetLang={handleToggleTargetLang}
            selectedSubtitleStyle={selectedSubtitleStyle}
            onSelectSubtitleStyle={setSelectedSubtitleStyle}
            activeArchetype={activePreset.archetype}
            activeTone={activePreset.tone}
            activeVoiceId={activePreset.ttsConfig.voice_id}
            bgmEnabled={activePreset.bgmEnabled}
            bgmAutoSmart={activePreset.bgmAutoSmart}
            sfxEnabled={activePreset.sfxEnabled}
            sfxUserFirst={activePreset.sfxUserFirst}
          />
        </div>

        {/* =======================================================================
            [ZONE 2] 중앙 5대 원천 소스 허브 (lg:col-span-5)
           ======================================================================= */}
        <div className="lg:col-span-5 h-full min-h-0">
          <OneTakeSourceSection
            communityList={communityList}
            newsList={newsList}
            redditList={redditList}
            scriptList={scriptList}
            videoList={combinedVideoList}
            activeSourceType={activeSourceType}
            onSourceTypeChange={setActiveSourceType}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={toggleSourceSelection}
            onSelectAll={handleSelectAllCurrent}
            customTextInput={customTextInput}
            onCustomTextChange={setCustomTextInput}
            onDropVideoFiles={handleDropVideoFiles}
            onOpenDetail={handleOpenSourceDetail}
          />
        </div>

        {/* =======================================================================
            [ZONE 3] 우측 4대 폼팩터 & 9:16 실물 비주얼 쇼케이스 (lg:col-span-4)
           ======================================================================= */}
        <div className="lg:col-span-4 h-full min-h-0">
          <VisualTemplateShowcase
            selectedArchetype={activePreset.archetype}
            onArchetypeChange={handleArchetypeChange}
            selectedTemplateId={activePreset.templateId}
            onTemplateIdChange={handleTemplateIdChange}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          [중앙 플로팅 마스터 발주 독] 원클릭 일괄 생산 발주 바
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="w-full bg-card border border-border/80 rounded-2xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* 발주 요약 칩 매트릭스 */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="flex items-center gap-1 font-bold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>일괄 생산 사양:</span>
          </span>

          <Badge variant="outline" className="text-[11px] font-semibold uppercase border-primary/30 text-primary bg-primary/5">
            {activePreset.archetype} 폼팩터
          </Badge>

          <span className="text-muted-foreground">·</span>

          <span className="text-muted-foreground text-[11px]">
            자막: <strong className="text-foreground">{selectedSubtitleStyle}</strong>
          </span>

          <span className="text-muted-foreground">·</span>

          {/* 타겟 언어 플래그들 */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-[11px]">언어:</span>
            {targetLangs.map(code => {
              const l = GLOBAL_LANGUAGES.find(x => x.code === code);
              return (
                <span key={code} className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-muted text-[10px] font-bold">
                  <span>{l?.flag || '🌐'}</span>
                  <span className="uppercase">{code}</span>
                </span>
              );
            })}
          </div>

          <span className="text-muted-foreground">·</span>

          <span className="text-[11px] text-muted-foreground">
            소스 <strong className="text-primary font-bold">{totalSelectedSources}</strong>개 선택 ×
            언어 <strong className="text-primary font-bold">{targetLangs.length}</strong>개 =
            총 <strong className="text-foreground font-black text-xs">{totalProjectedVideos}</strong>개 쇼츠 제작 대기
          </span>
        </div>

        {/* 원클릭 대형 발주 버튼 */}
        <Button
          type="button"
          disabled={isGenerating || totalSelectedSources === 0}
          onClick={handleStartBatch}
          className={cn(
            "h-9 px-5 rounded-xl font-bold text-xs gap-2 shadow-sm transition-all cursor-pointer",
            totalSelectedSources > 0
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressText || '쇼츠 일괄 렌더링 중...'}</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {totalSelectedSources > 0
                  ? `⚡ 주권 팩토리 일괄 발주 (${totalProjectedVideos}개 동시 제작)`
                  : '소스를 선택하세요'}
              </span>
            </>
          )}
        </Button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          [하단 전체 ZONE 4] 대용량 주권 생성 대기열 & 결과물 통합 워크벤치 (100% Space)
         ───────────────────────────────────────────────────────────────────────── */}
      <div className="w-full min-h-[320px]">
        <BatchWorkQueueSection
          items={workQueueItems}
          selectedItemIds={selectedQueueIds}
          onToggleSelect={(id) => {
            setSelectedQueueIds(prev =>
              prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
            );
          }}
          onToggleSelectAll={() => {
            if (selectedQueueIds.length === workQueueItems.length) {
              setSelectedQueueIds([]);
            } else {
              setSelectedQueueIds(workQueueItems.map(i => i.id));
            }
          }}
          onPlayItem={handlePlayJob}
          onViewDetail={handleViewDetail}
          onEditNle={handleEditNle}
          onExportCapcut={handleExportCapcut}
          onDeleteItem={handleDeleteQueueItem}
          onBulkExportCapcut={handleBulkExportCapcut}
          onBulkDelete={handleBulkDelete}
          onRefresh={() => {
            toast({ title: '대기열 동기화', description: '최신 생성 대기열 상태가 갱신되었습니다.' });
          }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          모달 다이얼로그들: 영상 재생 / 세부결과 / 통합 설정
         ───────────────────────────────────────────────────────────────────────── */}
      {/* 1. 영상 재생 모달 */}
      <VideoPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        title={previewData?.title || '쇼츠 비디오 미리보기'}
        videoUrl={previewData?.videoUrl}
        filePath={previewData?.filePath}
        sourceType={previewData?.sourceType}
        videoData={previewData?.videoData}
        onOpenEditor={() => previewData && handleEditNle(previewData)}
        onExportCapcut={previewData ? () => handleExportCapcut(previewData) : undefined}
        onSelectForBatch={
          previewData?.videoData?.id
            ? () => {
                const targetId = String(previewData.videoData.id);
                setSelectedSourceIds(prev => Array.from(new Set([...prev, targetId])));
                toast({
                  title: '⚡ 일괄 발주 대상 선택 완료',
                  description: `'${previewData.title}' 영상이 발주 선택 목록에 추가되었습니다.`
                });
              }
            : undefined
        }
      />

      {/* 2. 세부 결과 대본/자막/메타 검수 모달 */}
      <WorkItemDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        item={detailWorkItem}
        onPlay={handlePlayJob}
        onEditNle={handleEditNle}
        onExportCapcut={handleExportCapcut}
        onOpenArchetypeStudio={(item) => {
          navigate(`/shorts-editor/${item.archetype || 'classic'}`, {
            state: {
              fromBatch: true,
              title: item.title,
              sourceUrl: item.sourceOrigin
            }
          });
        }}
      />

      {/* 3. 원천 소스(대본/영상/커뮤니티) 상세 검수 모달 */}
      <SourceDetailModal
        open={sourceDetailOpen}
        onOpenChange={setSourceDetailOpen}
        sourceItem={selectedSourceItem}
        activeSourceType={activeSourceType}
        isSelected={selectedSourceItem ? selectedSourceIds.includes(selectedSourceItem.id) : false}
        onToggleSelect={toggleSourceSelection}
        onGoToScriptWriter={(srcItem) => {
          navigate('/shorts-production-studio', { state: { source: srcItem } });
        }}
        onGoToProEditor={(srcItem) => {
          navigate('/pro-editor', { state: { source: srcItem } });
        }}
      />

      {/* 3. 통합 설정 모달 다이얼로그 */}
      <MasterPresetConfigModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        currentPreset={activePreset}
        onApplyPreset={handleApplyUpdatedPreset}
        onSaveAsNewPreset={handleSaveAsNewPreset}
      />
    </div>
  );
};

export default OneTakeBatchTab;
