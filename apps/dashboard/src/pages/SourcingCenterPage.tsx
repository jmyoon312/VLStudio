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
} from 'lucide-react';
import { toast } from 'sonner';

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

  // Tab State: 'vault' (원천 영상 보관소) | 'campaigns' (자동 소싱 제어기)
  const [activeTab, setActiveTab] = useState<'vault' | 'campaigns'>('vault');

  // Vault State
  const [assets, setAssets] = useState<SourcingAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab === 'vault') {
      fetchAssets();
    } else {
      fetchCampaigns();
    }
  }, [activeTab, selectedGenre, selectedSubCategory]);

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

        {/* 탭 네비게이션 */}
        <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
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

      {/* 2. 본문 컨텐츠 영역 */}
      {activeTab === 'vault' ? (
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
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                  <Film className="w-10 h-10 mb-2 opacity-50" />
                                  <span className="text-xs">미리보기 준비 중</span>
                                </div>
                              )}

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
                              >
                                <Sparkles className="w-3 h-3" />
                                지금 제작
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
    </div>
  );
};
export default SourcingCenterPage;
