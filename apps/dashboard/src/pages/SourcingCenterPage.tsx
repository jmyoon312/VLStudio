import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Sparkles,
  Sliders,
  FolderOpen,
  Search,
  CheckCircle2,
  Clock,
  Play,
  Download,
  Copy,
  Send,
  RefreshCw,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle,
  Video,
  ListFilter,
  CheckSquare,
  Square,
  Compass,
  TrendingUp,
  Wand2,
  Zap,
  Flame,
  Heart,
  Smile,
  Skull,
  BarChart2,
  ExternalLink,
  Users,
  Tv,
  Scissors,
  HelpCircle,
  HardDrive,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface CinematicPosterCoverProps {
  title: string;
  thumbnailPath?: string | null;
  category?: string;
  country?: string;
  score?: number | string;
  year?: number | string;
}

const CinematicPosterCover: React.FC<CinematicPosterCoverProps> = ({
  title,
  thumbnailPath,
  category = '시네마',
  country,
  score = 90,
  year
}) => {
  const [imgError, setImgError] = useState(false);

  // Validate if thumbnail is a valid non-synthetic URL
  const isValidUrl = Boolean(
    thumbnailPath && 
    !thumbnailPath.includes('/kr-') && 
    !thumbnailPath.includes('/us-') && 
    !thumbnailPath.includes('/jp-') &&
    thumbnailPath.startsWith('http')
  );

  const getTheme = () => {
    if (category.includes('드라마') || category.includes('시리즈')) {
      return {
        bg: 'from-blue-950 via-slate-900 to-indigo-950',
        icon: <Tv className="w-4 h-4 text-blue-400 opacity-80" />
      };
    }
    if (category.includes('예능') || category.includes('버라이어티') || category.includes('연애')) {
      return {
        bg: 'from-amber-950 via-neutral-900 to-emerald-950',
        icon: <Sparkles className="w-4 h-4 text-amber-400 opacity-80" />
      };
    }
    if (category.includes('애니')) {
      return {
        bg: 'from-purple-950 via-slate-900 to-rose-950',
        icon: <Sparkles className="w-4 h-4 text-purple-400 opacity-80" />
      };
    }
    if (category.includes('다큐')) {
      return {
        bg: 'from-emerald-950 via-slate-900 to-teal-950',
        icon: <Flame className="w-4 h-4 text-emerald-400 opacity-80" />
      };
    }
    return {
      bg: 'from-slate-950 via-indigo-950/80 to-neutral-950',
      icon: <Film className="w-4 h-4 text-primary opacity-80" />
    };
  };

  const theme = getTheme();

  return (
    <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-xl overflow-hidden border border-border/80 shrink-0 shadow-xs select-none bg-neutral-950 flex">
      {isValidUrl && !imgError ? (
        <img
          src={thumbnailPath!}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-b ${theme.bg} p-2.5 flex flex-col justify-between items-center text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
          {/* Subtle noise/glow background */}
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-primary/10 blur-xl pointer-events-none" />
          
          {/* Top header: Country badge & Category icon */}
          <div className="w-full flex items-center justify-between z-10">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/60 text-white/90 border border-white/15 uppercase tracking-widest">
              {country || 'KR'}
            </span>
            <div className="p-1 rounded-md bg-black/30 backdrop-blur-xs">
              {theme.icon}
            </div>
          </div>

          {/* Center: Title typography (Cinema Poster aesthetic) */}
          <div className="my-auto z-10 px-0.5 w-full">
            <p className="text-xs font-black text-white leading-tight line-clamp-3 break-keep drop-shadow-md tracking-tight">
              {title}
            </p>
            {year && (
              <span className="text-[10px] text-white/60 font-semibold block mt-1 tracking-wider">
                {year}
              </span>
            )}
          </div>

          {/* Bottom star score badge space */}
          <div className="h-2" />
        </div>
      )}

      {isValidUrl && !imgError && country && (
        <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-black/80 text-white uppercase tracking-wider z-10 shadow-xs">
          {country}
        </span>
      )}

      <div className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground shadow-xs z-10">
        ★ {score}
      </div>
    </div>
  );
};

interface SourcingAsset {
  id: string;
  title: string;
  source_url: string;
  file_path: string;
  thumbnail_url: string;
  video_duration_sec: number;
  file_size_bytes: number;
  resolution: string;
  fps: number;
  clean_zone_score: number;
  genre: string;
  sub_category: string;
  movie_title: string;
  release_year: string;
  script_draft_60s: string;
  tags: string[];
  created_at: string;
}

interface SourcingCampaign {
  id: string;
  preset_id: string;
  preset_name: string;
  genre: string;
  sub_category: string;
  is_active: boolean;
  interval_hours: number;
  quota_per_run: number;
  min_resolution: string;
  min_clean_zone_score: number;
  keywords: string[];
  last_run_at: string | null;
  total_harvested_count: number;
}

export const SourcingCenterPage: React.FC = () => {
  const navigate = useNavigate();

  // Tab State: 'vault' (원천 영상 보관소) | 'curation' (명작·트렌드 발굴소) | 'campaigns' (자동 소싱 제어기)
  const [activeTab, setActiveTab] = useState<'vault' | 'curation' | 'campaigns'>('curation');

  // Vault State
  const [assets, setAssets] = useState<SourcingAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);

  // Curation State (명작·트렌드 발굴소)
  const [curatedWorks, setCuratedWorks] = useState<any[]>([]);
  const [isLoadingCurated, setIsLoadingCurated] = useState(false);
  const [curatedEmotion, setCuratedEmotion] = useState<string>('all');
  const [curatedMajorCat, setCuratedMajorCat] = useState<string>('all');
  const [curatedRelationship, setCuratedRelationship] = useState<string>('all');
  const [curatedTrope, setCuratedTrope] = useState<string>('all');
  const [curatedPersonality, setCuratedPersonality] = useState<string>('all');
  const [curatedEra, setCuratedEra] = useState<string>('all');
  const [curatedPerson, setCuratedPerson] = useState<string>('all');
  const [curatedQuery, setCuratedQuery] = useState<string>('');
  const [isSyncingPixeling, setIsSyncingPixeling] = useState(false);
  const [isHarvestingTmdb, setIsHarvestingTmdb] = useState(false);
  const [showTrendRadarModal, setShowTrendRadarModal] = useState(false);
  const [trendRadarData, setTrendRadarData] = useState<any>(null);
  const [slicingAssetId, setSlicingAssetId] = useState<string | null>(null);
  const [showStrategyGuideModal, setShowStrategyGuideModal] = useState(false);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<SourcingCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);

  // Fetch Assets
  const fetchAssets = async () => {
    setIsLoadingAssets(true);
    try {
      const params = new URLSearchParams();
      if (selectedGenre !== 'all') params.append('genre', selectedGenre);
      if (selectedSubCategory !== 'all') params.append('sub_category', selectedSubCategory);
      if (searchQuery) params.append('query', searchQuery);

      const res = await fetch(`/api/sourcing-center/assets?${params.toString()}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setAssets(data.assets || []);
      }
    } catch (err: any) {
      toast.error(`영상 보관소 불러오기 실패: ${err.message}`);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await fetch('/api/sourcing-center/campaigns');
      const data = await res.json();
      if (data.status === 'ok') {
        setCampaigns(data.campaigns || []);
      }
    } catch (err: any) {
      toast.error(`캠페인 불러오기 실패: ${err.message}`);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Fetch Curated Works (명작·트렌드 발굴소)
  const fetchCuratedWorks = async () => {
    setIsLoadingCurated(true);
    try {
      const params = new URLSearchParams();
      if (curatedQuery) params.append('query', curatedQuery);
      if (curatedEmotion !== 'all') params.append('emotion', curatedEmotion);
      if (curatedMajorCat !== 'all') params.append('major_cat', curatedMajorCat);
      if (curatedRelationship !== 'all') params.append('relationship', curatedRelationship);
      if (curatedTrope !== 'all') params.append('trope', curatedTrope);
      if (curatedPersonality !== 'all') params.append('personality', curatedPersonality);
      if (curatedEra !== 'all') params.append('era', curatedEra);
      if (curatedPerson !== 'all') params.append('person', curatedPerson);

      const res = await fetch(`/api/sourcing-center/curated-works?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCuratedWorks(data.items || []);
      }
    } catch (err: any) {
      toast.error(`큐레이션 작품 불러오기 실패: ${err.message}`);
    } finally {
      setIsLoadingCurated(false);
    }
  };

  // Sync Pixeling Catalog
  const handleSyncPixeling = async () => {
    setIsSyncingPixeling(true);
    try {
      const res = await fetch('/api/sourcing-center/pixeling/import', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(`픽셀링 검증 자산 동기화 완료: ${data.message}`);
        fetchCuratedWorks();
      } else {
        toast.error(`동기화 실패: ${data.detail || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      toast.error(`동기화 통신 오류: ${err.message}`);
    } finally {
      setIsSyncingPixeling(false);
    }
  };

  // Harvest TMDB Titles
  const handleHarvestTmdb = async (mediaType: 'movie' | 'tv' = 'movie') => {
    setIsHarvestingTmdb(true);
    try {
      const res = await fetch('/api/sourcing-center/tmdb/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: mediaType, region: 'KR', min_year: 2005 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`TMDB 숏폼 적합작 ${data.harvested_count}편 발골 및 적재 완료!`);
        fetchCuratedWorks();
      } else {
        toast.error(`TMDB 수집 실패: ${data.detail || '오류'}`);
      }
    } catch (err: any) {
      toast.error(`TMDB 통신 오류: ${err.message}`);
    } finally {
      setIsHarvestingTmdb(false);
    }
  };

  // Fetch Trend Radar
  const handleFetchTrendRadar = async () => {
    setShowTrendRadarModal(true);
    if (!trendRadarData) {
      try {
        const res = await fetch('/api/sourcing-center/trend-radar');
        const data = await res.json();
        if (data.success) {
          setTrendRadarData(data);
        }
      } catch (err: any) {
        toast.error(`트렌드 레이더 조회 실패: ${err.message}`);
      }
    }
  };

  // Slice & Create Short from Curated Asset
  const handleSliceAndCreate = async (asset: any) => {
    setSlicingAssetId(asset.id);
    try {
      const res = await fetch('/api/sourcing-center/slice-and-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: asset.id,
          preset_id: asset.linked_preset_id,
          hook_text: asset.script_draft,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`'${asset.title}' 씬 발골 완료! 아스트라 총괄 디렉터로 이동합니다.`);
        navigate('/director', {
          state: {
            selectedPresetId: data.preset_id,
            initialPrompt: `소싱 센터 발골 작품 [${asset.title}] 명장면 숏폼 제작을 시작해줘.\n3초 훅: ${data.hook_text}\n레퍼런스: ${data.source_url}`,
          },
        });
      } else {
        toast.error(`발골 실패: ${data.detail || '오류'}`);
      }
    } catch (err: any) {
      toast.error(`발골 통신 오류: ${err.message}`);
    } finally {
      setSlicingAssetId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'vault') {
      fetchAssets();
    } else if (activeTab === 'curation') {
      fetchCuratedWorks();
    } else {
      fetchCampaigns();
    }
  }, [
    activeTab,
    selectedGenre,
    selectedSubCategory,
    curatedEmotion,
    curatedMajorCat,
    curatedRelationship,
    curatedTrope,
    curatedPersonality,
    curatedEra,
    curatedPerson,
  ]);

  // Checkbox helpers
  const toggleSelectAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllAssets = () => {
    if (selectedAssetIds.length === assets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map((a) => a.id));
    }
  };

  // Action: Send Selected to Conversational Director (Route B)
  const handleSendToDirector = () => {
    const selected = assets.filter((a) => selectedAssetIds.includes(a.id));
    const paths = selected.map((a) => a.file_path).filter(Boolean);

    if (paths.length === 0) {
      toast.error('선택된 영상 중 다운로드된 로컬 파일이 없습니다. 먼저 다운로드를 완료해 주세요.');
      return;
    }

    toast.success(`${paths.length}개의 원천 영상이 총괄 연출 대화창으로 전송됩니다.`);
    navigate('/director', {
      state: {
        attachedMediaPaths: paths,
      },
    });
  };

  // Action: Copy File Paths
  const handleCopyPaths = () => {
    const selected = assets.filter((a) => selectedAssetIds.includes(a.id));
    const paths = selected.map((a) => a.file_path).filter(Boolean);

    if (paths.length === 0) {
      toast.error('복사할 로컬 파일 경로가 없습니다.');
      return;
    }

    navigator.clipboard.writeText(paths.join('\n'));
    toast.success(`${paths.length}개의 파일 경로가 클립보드에 복사되었습니다.`);
  };

  // Action: Render to Queue (Route A)
  const handleRenderToQueue = async () => {
    if (selectedAssetIds.length === 0) return;
    try {
      const res = await fetch('/api/sourcing-center/assets/render-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: selectedAssetIds,
          preset_id: 'tearful_cinema_v1',
          auto_start: true,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(data.message || '렌더링 대기열에 성공적으로 등록되었습니다.');
        setSelectedAssetIds([]);
      } else {
        toast.error(`대기열 전송 실패: ${data.message}`);
      }
    } catch (err: any) {
      toast.error(`통신 오류: ${err.message}`);
    }
  };

  // Action: Run Campaign Now
  const handleRunCampaignNow = async (campaignId: string) => {
    setRunningCampaignId(campaignId);
    try {
      const res = await fetch(`/api/sourcing-center/campaigns/${campaignId}/run-now`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.status === 'ok') {
        toast.success(data.message || '1회 자동 수집이 완료되었습니다!');
        fetchCampaigns();
      } else {
        toast.error(`수집 실패: ${data.message}`);
      }
    } catch (err: any) {
      toast.error(`수집 통신 오류: ${err.message}`);
    } finally {
      setRunningCampaignId(null);
    }
  };

  // Action: Toggle Campaign Active
  const handleToggleCampaign = async (campaign: SourcingCampaign) => {
    try {
      const res = await fetch(`/api/sourcing-center/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !campaign.is_active,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaign.id ? { ...c, is_active: !c.is_active } : c))
        );
        toast.success(`캠페인이 ${!campaign.is_active ? '활성화' : '일시정지'}되었습니다.`);
      }
    } catch (err: any) {
      toast.error(`상태 변경 실패: ${err.message}`);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // 8 Main Genres
  const genres = [
    { id: 'all', label: '전체 장르' },
    { id: '시네마/드라마', label: '🎬 시네마/드라마' },
    { id: '아이돌/연예인', label: '✨ 아이돌/연예인' },
    { id: '이슈/시사/정치', label: '⚖️ 이슈/시사/정치' },
    { id: '서브컬처/애니', label: '🎌 서브컬처/애니' },
    { id: '스포츠/피트니스', label: '⚽ 스포츠/피트니스' },
    { id: '예능/코미디', label: '🤣 예능/코미디' },
    { id: '커뮤니티/썰', label: '💬 커뮤니티/썰' },
    { id: '지식/교양/다큐', label: '📚 지식/교양/다큐' },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
      {/* 1. 최상단 헤더 바 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-card/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">소싱 센터 (Video-First Sourcing Hub)</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                1080p 고화질 원천 영상
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              프리셋 DNA 맞춤형 고화질 영상을 자동 수집하고 원클릭으로 숏폼 제작에 투입합니다.
            </p>
          </div>
        </div>

        {/* 우측 탭 네비게이션 & 소싱 가이드 버튼 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowStrategyGuideModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all shadow-xs"
            title="대용량 장편(무다운로드) vs 숏폼(전체다운로드) 소싱 전략 가이드"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>소싱 전략 가이드</span>
          </button>

          <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('curation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'curation'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="w-4 h-4 text-rose-500" />
              명작·트렌드 발굴소
              {curatedWorks.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                  {curatedWorks.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'vault'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Video className="w-4 h-4 text-primary" />
              원천 영상 보관소
              {assets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
                  {assets.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-500" />
              프리셋별 자동 소싱 제어기
              {campaigns.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/10 text-amber-600 font-bold">
                  {campaigns.filter((c) => c.is_active).length} 가동
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 본문 컨텐츠 영역 */}
      {activeTab === 'curation' ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* 상단 큐레이션 검색 & 퀵 액션 툴바 */}
          <div className="p-4 border-b border-border/80 bg-card/40 flex flex-col gap-3 flex-shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* 자연어 시맨틱 검색창 */}
              <div className="relative flex-1 min-w-[280px] max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={curatedQuery}
                  onChange={(e) => {
                    setCuratedQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setTimeout(() => fetchCuratedWorks(), 50);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCuratedWorks()}
                  placeholder="다차원 시맨틱 검색: '상사에게 사이다 날리는 직장인', '송강호 코믹한 장면'..."
                  className="w-full pl-9 pr-24 py-2 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  type="button"
                  onClick={fetchCuratedWorks}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                >
                  검색
                </button>
              </div>

              {/* 3대 정예 액션 버튼 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncPixeling}
                  disabled={isSyncingPixeling}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-all shadow-xs disabled:opacity-50"
                  title="구버전 픽셀링에서 엄선된 130+개 명작 DB 동기화"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPixeling ? 'animate-spin' : ''}`} />
                  픽셀링 검증 자산 동기화
                </button>

                <button
                  type="button"
                  onClick={() => handleHarvestTmdb('movie')}
                  disabled={isHarvestingTmdb}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-all shadow-xs disabled:opacity-50"
                  title="TMDB API 연동 및 숏폼 적합도 자체 확장 수집"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  TMDB 자체 확장
                </button>

                <button
                  type="button"
                  onClick={handleFetchTrendRadar}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-xs"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  트렌드 레이더 (VPH·아웃라이어)
                </button>
              </div>
            </div>

            {/* 감정 칩 필터 바 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                감정 도파민:
              </span>
              {[
                { id: 'all', label: '전체 감정' },
                { id: '참교육', label: '🤬 사이다/참교육' },
                { id: '슬픔', label: '😭 눈물/감동' },
                { id: '코믹', label: '😂 레전드 코믹' },
                { id: '반전', label: '😱 소름/반전' },
                { id: '도파민', label: '🔥 도파민/액션' },
                { id: '힐링', label: '🌿 힐링/감성' },
              ].map((em) => (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => setCuratedEmotion(em.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                    curatedEmotion === em.id
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {em.label}
                </button>
              ))}
            </div>

            {/* 4차원 직교 패싯 및 대분류 드롭다운 바 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-border/50 text-xs">
              {/* 대분류 */}
              <select
                value={curatedMajorCat}
                onChange={(e) => setCuratedMajorCat(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="all">전체 장르</option>
                <option value="시네마/영화">🎬 시네마/영화</option>
                <option value="K-드라마/시리즈">📺 K-드라마/시리즈</option>
                <option value="예능/버라이어티">🤣 예능/버라이어티</option>
                <option value="리얼리티/연애">💖 리얼리티/연애</option>
                <option value="애니메이션">🎌 애니메이션</option>
                <option value="다큐멘터리/지식">📚 다큐멘터리/지식</option>
                <option value="유튜브/크리에이터">⭐ 유튜브/크리에이터</option>
              </select>

              {/* 👥 인간관계 */}
              <select
                value={curatedRelationship}
                onChange={(e) => setCuratedRelationship(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="all">👥 전체 인간관계</option>
                <option value="상사와 부하">상사와 부하</option>
                <option value="부모와 자식">부모와 자식</option>
                <option value="형사와 범인">형사와 범인</option>
                <option value="라이벌/앙숙">라이벌/앙숙</option>
                <option value="동료/파트너">동료/파트너</option>
              </select>

              {/* ⚡ 극적 장치 */}
              <select
                value={curatedTrope}
                onChange={(e) => setCuratedTrope(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="all">⚡ 전체 극적 장치 (Trope)</option>
                <option value="클리셰 전복">클리셰 전복</option>
                <option value="각성과 복수">각성과 복수</option>
                <option value="은밀한 잠입">은밀한 잠입</option>
                <option value="시간 루프/초자연">시간 루프/초자연</option>
                <option value="극한 생존">극한 생존</option>
                <option value="성장과 우정">성장과 우정</option>
              </select>

              {/* 🎭 인물 성격 */}
              <select
                value={curatedPersonality}
                onChange={(e) => setCuratedPersonality(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="all">🎭 전체 인물 성격</option>
                <option value="소시민적 현실감 / 생활 연기">소시민적 현실감 / 생활 연기</option>
                <option value="압도적 피지컬 / 파워풀 리더">압도적 피지컬 / 파워풀 리더</option>
                <option value="번개같은 순발력 / 티키타카">번개같은 순발력 / 티키타카</option>
                <option value="능구렁이 캐릭터">능구렁이 캐릭터</option>
                <option value="광기 어린 빌런">광기 어린 빌런</option>
              </select>

              {/* 🕰️ 시대/분위기 */}
              <select
                value={curatedEra}
                onChange={(e) => setCuratedEra(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="all">🕰️ 전체 시대/분위기</option>
                <option value="90년대 레트로 / 클래식">90년대 레트로 / 클래식</option>
                <option value="2000년대 명작 황금기">2000년대 명작 황금기</option>
                <option value="2010년대 K-콘텐츠 르네상스">2010년대 K-콘텐츠 르네상스</option>
                <option value="2020년대 최신 트렌드">2020년대 최신 트렌드</option>
              </select>
            </div>

            {/* 파워 인물 빠른 필터 칩 */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Users className="w-3 h-3 text-primary" /> 파워 인물:
              </span>
              {[
                '송강호',
                '마동석',
                '이병헌',
                '강호동',
                '유재석',
                '차승원',
                '유해진',
                '송민호',
                '이제훈',
                '김상경',
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCuratedPerson(curatedPerson === p ? 'all' : p)}
                  className={`px-2 py-0.5 rounded-md border transition-all shrink-0 ${
                    curatedPerson === p
                      ? 'bg-primary text-primary-foreground border-primary font-semibold'
                      : 'bg-background border-border text-foreground hover:bg-muted'
                  }`}
                >
                  #{p}
                </button>
              ))}
              {curatedPerson !== 'all' && (
                <button
                  type="button"
                  onClick={() => setCuratedPerson('all')}
                  className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground text-[10px] underline shrink-0"
                >
                  인물 해제
                </button>
              )}
            </div>
          </div>

          {/* 큐레이션 카드 그리드 뷰 */}
          <div className="flex-1 p-6 overflow-y-auto">
            {isLoadingCurated ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm">고가치 명작 및 트렌드 발굴 자산을 탐색하는 중...</p>
              </div>
            ) : curatedWorks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
                <Compass className="w-10 h-10 text-muted-foreground/60" />
                <p className="text-sm">조건에 맞는 큐레이션 작품이 없습니다.</p>
                <button
                  type="button"
                  onClick={handleSyncPixeling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
                >
                  픽셀링 130+대 검증 자산 동기화하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {curatedWorks.map((work) => {
                  const meta = work.meta || {};
                  const isSlicing = slicingAssetId === work.id;

                  return (
                    <div
                      key={work.id}
                      className="group flex p-3.5 gap-3.5 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:shadow-md hover:border-primary/40 transition-all"
                    >
                      {/* 좌측: 시네마틱 포스터 커버 */}
                      <CinematicPosterCover
                        title={work.title}
                        thumbnailPath={work.thumbnail_path}
                        category={work.category_major}
                        country={meta.country}
                        score={work.vision_score || meta.score || 90}
                        year={meta.year}
                      />

                      {/* 우측: 핵심 메타, 3초 킬러 훅, 발골 액션 */}
                      <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5 gap-2">
                        {/* 1. 카테고리 헤더 & 감정 태그 */}
                        <div>
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                                {work.category_major || '시네마'}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                                {meta.year || 2020}
                              </span>
                              {meta.facets?.trope && (
                                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground truncate">
                                  ⚡ {meta.facets.trope}
                                </span>
                              )}
                            </div>

                            {/* 감정 뱃지 */}
                            <div className="flex items-center gap-1 shrink-0">
                              {(meta.emotions || []).slice(0, 2).map((em: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                >
                                  #{em}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 작품 제목 & 출연진 */}
                          <h3 className="text-sm font-extrabold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-snug">
                            {work.title}
                          </h3>
                          {meta.people && meta.people.length > 0 && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                              👥 {meta.people.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* 2. 핵심 3초 킬러 훅 하이라이트 배너 */}
                        {(work.script_draft || work.summary) && (
                          <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-[11px] font-medium text-amber-900 dark:text-amber-300 leading-snug line-clamp-2 shadow-2xs">
                            <span className="font-bold text-amber-700 dark:text-amber-400 mr-1 shrink-0">🎯 3초 훅:</span>
                            <span>{work.script_draft || work.summary}</span>
                          </div>
                        )}

                        {/* 3. 하단 발골 & 제작 버튼 바 */}
                        <div className="pt-1.5 border-t border-border/60 flex items-center gap-2 mt-auto">
                          <button
                            type="button"
                            onClick={() => handleSliceAndCreate(work)}
                            disabled={isSlicing}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                            title="전체 다운로드 없이 10~20GB 장편에서 15~30초 하이라이트 구간만 초고속 스트림 슬라이싱"
                          >
                            {isSlicing ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                씬 발골 중...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                1초 무다운로드 발골 & 제작
                              </>
                            )}
                          </button>

                          {work.source_url && (
                            <a
                              href={work.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all shrink-0"
                              title="유튜브 명장면 검색 확인"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'vault' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측 카테고리 트리 사이드바 */}
          <div className="w-64 border-r border-border/80 bg-card/30 p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                장르 필터
              </span>
              <div className="flex flex-col gap-1">
                {genres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setSelectedSubCategory('all');
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      selectedGenre === g.id
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 감동/눈물실화 서브 카테고리 바로가기 */}
            {selectedGenre === '시네마/드라마' && (
              <div className="pt-2 border-t border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  시네마 소분류
                </span>
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'all', label: '전체 보기' },
                    { id: '감동/눈물실화', label: '💧 감동/눈물실화' },
                    { id: '반전/스릴러', label: '⚡ 반전/스릴러' },
                    { id: '사이다/복수', label: '🔥 사이다/복수' },
                    { id: '로맨스/드라마', label: '🌸 로맨스/드라마' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubCategory(sub.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all text-left ${
                        selectedSubCategory === sub.id
                          ? 'bg-secondary text-secondary-foreground font-bold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 우측 메인 리스트/그리드 */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* 툴바 & 일괄 액션 바 */}
            <div className="p-4 border-b border-border/80 flex flex-wrap items-center justify-between gap-3 bg-card/20">
              <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
                    placeholder="영화 제목, 원본 영상명, 키워드 검색..."
                    className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-lg text-xs border border-border focus:outline-hidden focus:border-primary transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchAssets}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* 다중 선택 액션 바 */}
              {selectedAssetIds.length > 0 ? (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-xl animate-in fade-in">
                  <span className="text-xs font-bold text-primary mr-1">
                    {selectedAssetIds.length}개 선택됨
                  </span>

                  {/* 1. 대화창으로 전송 */}
                  <button
                    type="button"
                    onClick={handleSendToDirector}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    대화창으로 전송
                  </button>

                  {/* 2. 경로 복사 */}
                  <button
                    type="button"
                    onClick={handleCopyPaths}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background text-foreground hover:bg-muted border border-border transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    경로 복사
                  </button>

                  {/* 3. 일괄 렌더링 */}
                  <button
                    type="button"
                    onClick={handleRenderToQueue}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    렌더링 대기열 직결
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllAssets}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    전체 선택
                  </button>
                </div>
              )}
            </div>

            {/* 비디오 그리드 목록 */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingAssets ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <RefreshCw className="w-8 h-8 animate-spin mb-3 text-primary" />
                  <p className="text-sm">원천 영상 보관소를 조회하는 중입니다...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-border rounded-2xl p-8 text-center max-w-lg mx-auto mt-12">
                  <Film className="w-12 h-12 mb-3 text-muted-foreground/60" />
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    수집된 원천 영상이 없습니다
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    상단의 <strong>프리셋별 자동 소싱 제어기</strong>에서 자율 수집 캠페인을 가동하거나,
                    총괄 연출 대화창에서 "눈물한가득 소스 영상 찾아줘"를 입력해 발굴해 보세요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('campaigns')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                  >
                    자동 소싱 제어기 열기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.map((asset) => {
                    const isSelected = selectedAssetIds.includes(asset.id);
                    const isPlaying = playingAssetId === asset.id;
                    const isExpandedScript = expandedScriptId === asset.id;
                    const hasLocalFile = !!asset.file_path;

                    return (
                      <div
                        key={asset.id}
                        className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs flex flex-col ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                            : 'border-border/80 hover:border-border hover:shadow-md'
                        }`}
                      >
                        {/* 미디어 플레이어 / 썸네일 영역 */}
                        <div className="relative w-full aspect-video bg-black flex-shrink-0 group">
                          {isPlaying && hasLocalFile ? (
                            <video
                              src={`/api/stream?path=${encodeURIComponent(asset.file_path)}`}
                              controls
                              autoPlay
                              className="w-full h-full object-contain"
                              onEnded={() => setPlayingAssetId(null)}
                            />
                          ) : (
                            <>
                              {asset.thumbnail_url ? (
                                <img
                                  src={asset.thumbnail_url}
                                  alt={asset.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const fallback = (e.target as HTMLImageElement).nextElementSibling;
                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className={`w-full h-full flex flex-col items-center justify-center text-muted-foreground ${asset.thumbnail_url ? 'hidden' : 'flex'}`}
                              >
                                <Film className="w-10 h-10 mb-2 opacity-50" />
                                <span className="text-xs">미리보기 준비 중</span>
                              </div>

                              {/* 재생 버튼 오버레이 */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                                {hasLocalFile ? (
                                  <button
                                    type="button"
                                    onClick={() => setPlayingAssetId(asset.id)}
                                    className="p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
                                  >
                                    <Play className="w-6 h-6 fill-current" />
                                  </button>
                                ) : (
                                  <a
                                    href={asset.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-full bg-black/80 text-white text-xs font-semibold backdrop-blur-md hover:bg-black transition-colors"
                                  >
                                    원본 링크 열기
                                  </a>
                                )}
                              </div>
                            </>
                          )}

                          {/* 체크박스 선택 (좌상단) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectAsset(asset.id);
                            }}
                            className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-white/80" />
                            )}
                          </button>

                          {/* 해상도 뱃지 (우상단) */}
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-blue-600/90 text-[10px] font-bold text-white uppercase tracking-wider">
                            {asset.resolution || '1080P'}
                          </div>

                          {/* 재생시간 & 용량 뱃지 (우하단) */}
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 text-[11px] font-mono text-white backdrop-blur-xs">
                            <span>{formatDuration(asset.video_duration_sec)}</span>
                            {asset.file_size_bytes > 0 && (
                              <>
                                <span>•</span>
                                <span>{formatFileSize(asset.file_size_bytes)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 메타데이터 본문 */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                                {asset.title}
                              </h4>
                            </div>

                            {/* 장르, 영화명, 비전 배지 */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground">
                                {asset.genre}
                              </span>
                              {asset.movie_title && (
                                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  🎬 {asset.movie_title} {asset.release_year ? `(${asset.release_year})` : ''}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                클린존 {asset.clean_zone_score}%
                              </span>
                            </div>
                          </div>

                          {/* 하단 개별 액션 바 */}
                          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                            {asset.script_draft_60s && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedScriptId(isExpandedScript ? null : asset.id)
                                }
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                {isExpandedScript ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                60초 대본 초안
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!asset.file_path) {
                                    toast.error('로컬 파일이 없습니다.');
                                    return;
                                  }
                                  navigate('/director', {
                                    state: { attachedMediaPaths: [asset.file_path] },
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors text-xs flex items-center gap-1"
                                title="대화창으로 전송"
                              >
                                <Send className="w-3.5 h-3.5 text-primary" />
                              </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        '/api/sourcing-center/assets/render-to-queue',
                                        {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            asset_ids: [asset.id],
                                            preset_id: 'tearful_cinema_v1',
                                            auto_start: true,
                                          }),
                                        }
                                      );
                                      const data = await res.json();
                                      if (data.status === 'ok') {
                                        toast.success('렌더링 대기열에 등록되었습니다.');
                                      }
                                    } catch (err: any) {
                                      toast.error(`실패: ${err.message}`);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1"
                                  title="로컬 다운로드 1080p 고화질 원본 기반 무손실 컷편집 렌더링"
                                >
                                  <HardDrive className="w-3 h-3" />
                                  고화질 컷제작
                                </button>
                            </div>
                          </div>

                          {/* 60초 대본 접이식 패널 */}
                          {isExpandedScript && asset.script_draft_60s && (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/60 border border-border text-[11px] font-mono leading-relaxed whitespace-pre-wrap select-text">
                              {asset.script_draft_60s}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 탭 2: 프리셋별 자동 소싱 제어기 */
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            {/* 안내 배너 */}
            <div className="p-5 rounded-2xl bg-card border border-border/80 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  프리셋 주권 자율 소싱 캠페인 거버넌스
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  눈물한가득(감동 실화 영화), 패션탐정냥(아이돌 패션 이슈) 등 등록된 프리셋 DNA에 맞춰
                  1080p 고화질 원천 영상을 자율적으로 모니터링하고 수집합니다.
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                1080p 무자막 클린존 엄수
              </div>
            </div>

            {/* 캠페인 카드 목록 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {campaigns.map((camp) => {
                const isRunning = runningCampaignId === camp.id;

                return (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between gap-4 hover:border-border transition-all"
                  >
                    <div>
                      {/* 카드 상단: 프리셋 정보 & 활성화 스위치 */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-foreground">
                              {camp.preset_name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                              {camp.genre}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-0.5 block">
                            소분류: {camp.sub_category}
                          </span>
                        </div>

                        {/* ON/OFF 토글 스위치 */}
                        <button
                          type="button"
                          onClick={() => handleToggleCampaign(camp)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            camp.is_active ? 'bg-primary' : 'bg-muted border border-border'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              camp.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 수집 조건 및 스펙 그리드 */}
                      <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs mb-3">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">수집 주기</span>
                          <span className="font-semibold text-foreground">
                            매 {camp.interval_hours}시간마다
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">1회 수집 쿼터</span>
                          <span className="font-semibold text-foreground">
                            최대 {camp.quota_per_run}편
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">최소 해상도</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {camp.min_resolution}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">클린존 기준</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {camp.min_clean_zone_score}% 이상
                          </span>
                        </div>
                      </div>

                      {/* 타겟 키워드 태그들 */}
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground mb-1.5 block">
                          타겟 발굴 키워드 ({camp.keywords.length}개):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {camp.keywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[11px] bg-background border border-border text-foreground"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 카드 하단 액션 & 통계 */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <span>누적 수집: </span>
                        <strong className="text-foreground">{camp.total_harvested_count}편</strong>
                        {camp.last_run_at && (
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            (최근: {camp.last_run_at.split('T')[0]})
                          </span>
                        )}
                      </div>

                      {/* 지금 즉시 1회 수집 버튼 */}
                      <button
                        type="button"
                        onClick={() => handleRunCampaignNow(camp.id)}
                        disabled={isRunning}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            수집 중...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            지금 즉시 1회 수집
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. 트렌드 알고리즘 레이더 모달 (VPH / 아웃라이어 / 틱톡 / 인스타) */}
      {showTrendRadarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl flex flex-col gap-6 text-foreground">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    실시간 트렌드 알고리즘 레이더 (Trend Radar)
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      LIVE
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    단순 조회수가 아닌 VPH(시간당 가속도)와 아웃라이어 폭발 배수로 검증된 황금 소재 지표
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTrendRadarModal(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-semibold"
              >
                닫기
              </button>
            </div>

            {/* 모달 본문 리포트 */}
            {trendRadarData ? (
              <div className="flex flex-col gap-6">
                {/* 1. 아웃라이어 폭발 쇼츠 */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-500" />
                    채널 평균 대비 폭발 배수 (Outlier Ratio Top)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(trendRadarData.trending_shorts || []).map((s: any) => (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl border border-border/80 bg-background/60 flex flex-col justify-between gap-2 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                              {s.outlier_ratio} 폭발
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                              VPH {s.vph.toLocaleString()}/h
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground line-clamp-2">
                            {s.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            채널: {s.channel_name}
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-muted/60 text-[10px] text-muted-foreground font-medium border border-border/40">
                          {s.hook_text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. 벤치마킹 급성장 채널 */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    쇼츠 전환율 80%+ 벤치마킹 급성장 채널 (Benchmark Channels)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(trendRadarData.trending_channels || []).map((ch: any) => (
                      <div
                        key={ch.id}
                        className="p-4 rounded-2xl border border-border/80 bg-background/60 flex flex-col justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-bold text-foreground">
                              {ch.name}
                            </h4>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {ch.growth_rate_pct}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{ch.handle}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">
                            <span>구독자: {ch.subscribers}</span>
                            <span>•</span>
                            <span>일일: {ch.daily_views}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-border/50 text-[10px] text-primary font-semibold flex items-center gap-1">
                          <span>권장 프리셋:</span>
                          <span className="underline">{ch.matching_preset}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. 틱톡 음원 바이럴리티 & 인스타 저장/공유율 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 틱톡 */}
                  <div className="p-4 rounded-2xl border border-border/80 bg-background/40 flex flex-col gap-3">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-blue-500">
                      <Zap className="w-4 h-4" /> 틱톡 급상승 음원 바이럴리티 (Sound Velocity)
                    </h4>
                    <div className="flex flex-col gap-2">
                      {(trendRadarData.trending_sounds || []).map((snd: any) => (
                        <div
                          key={snd.sound_id}
                          className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-foreground">{snd.title}</div>
                            <div className="text-[10px] text-muted-foreground">{snd.artist}</div>
                          </div>
                          <div className="text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              48h {snd['48h_video_growth']}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 인스타 */}
                  <div className="p-4 rounded-2xl border border-border/80 bg-background/40 flex flex-col gap-3">
                    <h4 className="text-xs font-bold flex items-center gap-1.5 text-purple-500">
                      <Heart className="w-4 h-4" /> 인스타그램 릴스 저장 & DM 공유율 최우수 포맷
                    </h4>
                    <div className="flex flex-col gap-2">
                      {(trendRadarData.instagram_trends || []).map((ig: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-card border border-border/60 flex flex-col gap-1 text-xs"
                        >
                          <div className="font-bold text-foreground">{ig.theme}</div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span>북마크 저장률: <strong className="text-purple-600">{ig.save_rate_pct}</strong></span>
                            <span>DM 공유율: <strong className="text-purple-600">{ig.share_rate_pct}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs">실시간 알고리즘 지표를 연산하는 중입니다...</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 4. 소싱 전략 & 하이브리드 제작 가이드 모달 */}
      {showStrategyGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    소싱 센터 전략 가이드: 무다운로드 vs 전체 다운로드
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    영상 포맷(영화·드라마 vs 숏폼)과 용량에 따른 최적의 쇼츠 제작 파이프라인 지침
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStrategyGuideModal(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-foreground leading-relaxed">
              {/* 핵심 요약 배너 */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm block mb-1">
                  💡 핵심 적용 원칙 (하이브리드 소싱)
                </span>
                <p>
                  <strong>대용량 장편 영상(영화, 드라마, 라이브 등 1~20GB)</strong>은 인터넷에서 <strong>무다운로드 1초 스트림 슬라이싱</strong>으로 원하는 하이라이트 구간만 신속하게 추출하고,
                  <strong>용량이 적은 숏폼(틱톡, 릴스, 클립 등 10~80MB)</strong>이나 다중 컷 분할/4K 보존이 필요한 영상은 <strong>로컬 보관함에 전체 다운로드</strong>하여 컷편집하는 것이 최상의 전략입니다.
                </p>
              </div>

              {/* 1. 비교 분석 매트릭스 */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-primary" />
                  소싱 방식별 기술 스펙 및 장단점 비교
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 무다운로드 슬라이싱 */}
                  <div className="p-4 rounded-xl border border-border/80 bg-background/60 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          ⚡ 무다운로드 슬라이싱 (HTTP Range)
                        </span>
                        <span className="text-[10px] text-muted-foreground">HTTP Range 분할</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] mb-2.5">
                        전체 파일을 다운받지 않고, 지정한 시작/종료 초(Seconds)의 미디어 패킷 청크만 즉시 수신
                      </p>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong>10~20GB 영화</strong>도 1~2초 만에 15초 하이라이트 씬 발골</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>네트워크 트래픽 소모 99% 절감 (수 MB 수준 임시 수신)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Lanczos 고차원 보간 + Unsharp 엣지 샤프닝으로 선명도 복원</span>
                        </li>
                      </ul>
                    </div>
                    <div className="pt-2.5 border-t border-border/50 text-[10px] text-primary font-semibold">
                      추천: 영화/드라마 명장면, 다큐멘터리, 1~3시간 라이브 방송
                    </div>
                  </div>

                  {/* 전체 다운로드 후 컷편집 */}
                  <div className="p-4 rounded-xl border border-border/80 bg-background/60 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          💾 전체 다운로드 컷편집 (Local NLE)
                        </span>
                        <span className="text-[10px] text-muted-foreground">07_Downloads 보관</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] mb-2.5">
                        영상을 원본 그대로 로컬 디스크에 내려받은 후 프레임 단위로 미세 분할 편집
                      </p>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>1080p/4K 최고 비트레이트 원본 손실 0% 영구 보존</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>하나의 영상에서 여러 쇼츠(10개 이상)를 반복 추출할 때 안정적</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span>숏폼 영상(수십 MB)은 1~2초 만에 다운로드되므로 부담 없음</span>
                        </li>
                      </ul>
                    </div>
                    <div className="pt-2.5 border-t border-border/50 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      추천: 틱톡/릴스 숏폼, 시리즈물 대량 컷팅, 무손실 4K 영상
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 구간 자르기 기술적 핵심 (Keyframes & GOP) */}
              <div className="p-4 rounded-xl bg-card border border-border/80 space-y-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-amber-500" />
                  원하는 구간 자르기(Cutting)의 기술적 핵심
                </h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  비디오 스트림은 완전한 이미지인 <strong>키프레임(I-Frame)</strong>과 전후 프레임 변화량만 저장하는 <strong>P/B-Frame</strong>으로 이루어져 있습니다.
                  단순 복사로 임의 시간을 자르면 <strong>첫 1~2초간 화면이 멈추거나 깨지는 현상(검은 화면)</strong>이 발생합니다.
                  <br />
                  ViraLoop 소싱 엔진은 슬라이싱 시 <code className="px-1.5 py-0.5 rounded bg-muted text-primary font-mono text-[10px]">--force-keyframes-at-cuts</code>를 강제 적용하여 <strong>시작 지점에 새 키프레임을 즉시 생성</strong>하므로, 어떤 초(Second)를 지정해도 0.1초의 오차 없이 첫 프레임부터 깨끗하게 재생됩니다.
                </p>
              </div>

              {/* 3. 소싱 센터 메뉴별 활용법 */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  소싱 센터 메뉴별 연계 프로세스
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                    <span className="font-bold text-foreground block mb-1">
                      1. [명작·트렌드 발굴소] 탭
                    </span>
                    <span className="text-muted-foreground">
                      영화/드라마/시리즈 큐레이션 작품 카드의 <strong>[1초 씬 발골 & 제작]</strong> 버튼을 누르면 무다운로드 슬라이싱으로 즉시 하이라이트 구간을 생성하여 디렉터 제작창으로 연결됩니다.
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                    <span className="font-bold text-foreground block mb-1">
                      2. [원천 영상 보관소] 탭
                    </span>
                    <span className="text-muted-foreground">
                      이미 다운로드된 1080p 고화질 클립들이 보관되어 있으며, <strong>[지금 제작]</strong> 또는 <strong>[대화창 전송]</strong>을 통해 로컬 컷편집 파이프라인으로 무손실 제작됩니다.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-3 border-t border-border/80 bg-muted/30 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                ViraLoop 하이브리드 소싱 엔진 v2.5
              </span>
              <button
                type="button"
                onClick={() => setShowStrategyGuideModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SourcingCenterPage;
