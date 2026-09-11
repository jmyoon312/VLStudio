import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap,
  LayoutTemplate,
  FolderOpen,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ddalkkakApi, SubtitleJob, TtsDubJob, ClipEditJob } from '@/services/ddalkkakApi';
import { SubtitleStudioTab } from './Ddalkkak/SubtitleStudioTab';
import { TtsDubStudioTab } from './Ddalkkak/TtsDubStudioTab';
import { ClipEditStudioTab } from './Ddalkkak/ClipEditStudioTab';
import { FloatingBatchActionBar } from './Ddalkkak/FloatingBatchActionBar';
import { DdalkkakResultModal } from './Ddalkkak/DdalkkakResultModal';
import { generatePixelingStandardMeta } from '@/lib/ddalkkakPixeling';

export const ShortsProductionStudio: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Active Tab state (Default: subtitle)
  const [activeTab, setActiveTab] = useState<'subtitle' | 'ttsdub' | 'clipedit'>('subtitle');

  // Selected Template Style from ShortsTemplateStudio
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template_standard_shorts');
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([
    { id: 'template_standard_shorts', name: '⚡ 쇼츠 스탠다드 레터박스형' },
    { id: 'template_cinematic_fullscreen', name: '🎬 시네마틱 풀스크린 & 형광펜' },
    { id: 'template_fashion_nyan', name: '⚡ 패션탐정냥 골든 예능형 (실측치)' },
    { id: 'template_mystery_narrative', name: '📜 야담 & 미스터리 딥내러티브' }
  ]);

  // Jobs state for each studio
  const [subtitleJobs, setSubtitleJobs] = useState<SubtitleJob[]>([]);
  const [ttsDubJobs, setTtsDubJobs] = useState<TtsDubJob[]>([]);
  const [clipJobs, setClipJobs] = useState<ClipEditJob[]>([]);

  // Selection states
  const [selectedSubtitleJobIds, setSelectedSubtitleJobIds] = useState<number[]>([]);
  const [selectedTtsDubJobIds, setSelectedTtsDubJobIds] = useState<number[]>([]);
  const [selectedClipJobIds, setSelectedClipJobIds] = useState<number[]>([]);

  // Result Modal state
  const [resultModalOpen, setResultModalOpen] = useState<boolean>(false);
  const [activeResultJob, setActiveResultJob] = useState<any>(null);
  const [activeResultType, setActiveResultType] = useState<'subtitle' | 'tts-dub' | 'clip-edit'>('subtitle');

  // Health / Engine Status
  const [engineStatus, setEngineStatus] = useState<string>('초기화 중...');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync tab with URL search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'ttsdub' || tabParam === 'clipedit' || tabParam === 'subtitle') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load templates from backend if available
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/shorts-production/templates');
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setAvailableTemplates(data.items);
          }
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  const handleTabChange = (tab: 'subtitle' | 'ttsdub' | 'clipedit') => {
    setActiveTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams, { replace: true });
  };

  // Load health & summary
  const loadSystemInfo = useCallback(async () => {
    try {
      const h = await ddalkkakApi.getHealth();
      setEngineStatus(h.engine || 'VLStudio Native AI Core');
    } catch {
      setEngineStatus('VLStudio AI Core (온라인)');
    }
  }, []);

  // Load Subtitle Jobs
  const loadSubtitleJobs = useCallback(async () => {
    try {
      const jobs = await ddalkkakApi.getSubtitles();
      setSubtitleJobs(jobs);
    } catch (err) {
      console.error('Failed to load subtitle jobs:', err);
    }
  }, []);

  // Load TTS Dub Jobs
  const loadTtsDubJobs = useCallback(async () => {
    try {
      const jobs = await ddalkkakApi.getTtsJobs();
      setTtsDubJobs(jobs);
    } catch (err) {
      console.error('Failed to load tts dub jobs:', err);
    }
  }, []);

  // Load Clip Jobs
  const loadClipJobs = useCallback(async () => {
    try {
      const jobs = await ddalkkakApi.getClipJobs();
      setClipJobs(jobs);
    } catch (err) {
      console.error('Failed to load clip jobs:', err);
    }
  }, []);

  // Initial & periodic polling (every 5 seconds)
  useEffect(() => {
    loadSystemInfo();
    loadSubtitleJobs();
    loadTtsDubJobs();
    loadClipJobs();

    const interval = setInterval(() => {
      if (activeTab === 'subtitle') loadSubtitleJobs();
      else if (activeTab === 'ttsdub') loadTtsDubJobs();
      else if (activeTab === 'clipedit') loadClipJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, loadSystemInfo, loadSubtitleJobs, loadTtsDubJobs, loadClipJobs]);

  // ---------- Selection Toggles ----------
  const toggleSelectSubtitle = (id: number) => {
    setSelectedSubtitleJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAllSubtitles = () => {
    if (selectedSubtitleJobIds.length === subtitleJobs.length) {
      setSelectedSubtitleJobIds([]);
    } else {
      setSelectedSubtitleJobIds(subtitleJobs.map(j => j.id));
    }
  };

  const toggleSelectTtsDub = (id: number) => {
    setSelectedTtsDubJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAllTtsDub = () => {
    if (selectedTtsDubJobIds.length === ttsDubJobs.length) {
      setSelectedTtsDubJobIds([]);
    } else {
      setSelectedTtsDubJobIds(ttsDubJobs.map(j => j.id));
    }
  };

  const toggleSelectClip = (id: number) => {
    setSelectedClipJobIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ---------- Deletions ----------
  const handleDeleteSubtitle = async (id: number) => {
    if (!window.confirm('이 자막 작업을 삭제하시겠습니까?')) return;
    try {
      await ddalkkakApi.deleteSubtitleJob(id);
      setSelectedSubtitleJobIds(prev => prev.filter(x => x !== id));
      loadSubtitleJobs();
      toast({ title: '삭제 완료', description: '자막 작업이 삭제되었습니다.' });
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDeleteTtsDub = async (id: number) => {
    if (!window.confirm('이 대본+더빙 작업을 삭제하시겠습니까?')) return;
    try {
      await ddalkkakApi.deleteTtsJob(id);
      setSelectedTtsDubJobIds(prev => prev.filter(x => x !== id));
      loadTtsDubJobs();
      toast({ title: '삭제 완료', description: '대본+더빙 작업이 삭제되었습니다.' });
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDeleteClip = async (id: number) => {
    if (!window.confirm('이 클립 편집 작업을 삭제하시겠습니까?')) return;
    try {
      await ddalkkakApi.deleteClipJob(id);
      setSelectedClipJobIds(prev => prev.filter(x => x !== id));
      loadClipJobs();
      toast({ title: '삭제 완료', description: '클립 편집 작업이 삭제되었습니다.' });
    } catch {
      toast({ title: '오류', description: '삭제에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    if (activeTab === 'subtitle') {
      if (selectedSubtitleJobIds.length === 0) return;
      if (!window.confirm(`선택한 ${selectedSubtitleJobIds.length}개의 자막 작업을 삭제하시겠습니까?`)) return;
      for (const id of selectedSubtitleJobIds) {
        try { await ddalkkakApi.deleteSubtitleJob(id); } catch (_) {}
      }
      setSelectedSubtitleJobIds([]);
      loadSubtitleJobs();
      toast({ title: '일괄 삭제 완료' });
    } else if (activeTab === 'ttsdub') {
      if (selectedTtsDubJobIds.length === 0) return;
      if (!window.confirm(`선택한 ${selectedTtsDubJobIds.length}개의 대본+더빙 작업을 삭제하시겠습니까?`)) return;
      for (const id of selectedTtsDubJobIds) {
        try { await ddalkkakApi.deleteTtsJob(id); } catch (_) {}
      }
      setSelectedTtsDubJobIds([]);
      loadTtsDubJobs();
      toast({ title: '일괄 삭제 완료' });
    }
  };

  // ---------- 📤 픽셀링 메타 화면으로 전송 (Send to PixelingImportDialog) ----------
  const handleSendToPixeling = (targetJobs?: any[]) => {
    let jobsToExport: any[] = [];
    if (targetJobs && targetJobs.length > 0) {
      jobsToExport = targetJobs;
    } else if (activeTab === 'subtitle') {
      jobsToExport = subtitleJobs.filter(j => selectedSubtitleJobIds.includes(j.id));
    } else if (activeTab === 'ttsdub') {
      jobsToExport = ttsDubJobs.filter(j => selectedTtsDubJobIds.includes(j.id));
    }

    if (jobsToExport.length === 0) {
      toast({ title: '안내', description: '픽셀링 메타 화면으로 보낼 완료된 작업을 선택해주세요.' });
      return;
    }

    setResultModalOpen(false);
    const metaText = generatePixelingStandardMeta(jobsToExport);
    sessionStorage.setItem('pending_pixeling_meta', metaText);
    sessionStorage.setItem('pending_pixeling_open', 'true');

    toast({
      title: '픽셀링 메타 화면으로 이동',
      description: `총 ${jobsToExport.length}개의 표준 픽셀링 메타가 준비되었습니다. 자동화 작업 대기열로 이동합니다.`
    });

    navigate('/work-queue');
  };

  // ---------- 📋 픽셀링 메타 텍스트 복사 ----------
  const handleCopyPixelingMeta = (targetJobs?: any[]) => {
    let jobsToExport: any[] = [];
    if (targetJobs && targetJobs.length > 0) {
      jobsToExport = targetJobs;
    } else if (activeTab === 'subtitle') {
      jobsToExport = subtitleJobs.filter(j => selectedSubtitleJobIds.includes(j.id));
    } else if (activeTab === 'ttsdub') {
      jobsToExport = ttsDubJobs.filter(j => selectedTtsDubJobIds.includes(j.id));
    }

    if (jobsToExport.length === 0) {
      toast({ title: '안내', description: '복사할 작업을 선택해주세요.' });
      return;
    }

    const metaText = generatePixelingStandardMeta(jobsToExport);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(metaText);
      } else {
        const ta = document.createElement('textarea');
        ta.value = metaText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      toast({
        title: '픽셀링 표준 메타 복사 완료',
        description: `총 ${jobsToExport.length}개 영상의 픽셀링 메타 텍스트가 클립보드에 복사되었습니다.`
      });
    } catch (_) {
      toast({ title: '오류', description: '클립보드 복사에 실패했습니다.', variant: 'destructive' });
    }
  };

  // ---------- 🎬 CapCut 내보내기 (단일 & 일괄) ----------
  const handleExportSingleCapcut = async (job: any, type: string) => {
    setIsExporting(true);
    toast({ title: 'CapCut 프로젝트 생성 중...', description: '자막, 오디오, 비디오 데이터를 조합하고 있습니다.' });

    try {
      let targetDir = '';
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && typeof electronAPI.detectCapcutPath === 'function') {
        try {
          const detected = await electronAPI.detectCapcutPath();
          targetDir = detected?.targetPath || detected?.draftRoot || '';
        } catch (_) {}
      }

      // Backend CapCut Project Exporter Engine (Creates full draft_content.json, draft_meta_info.json, materials)
      const res = await ddalkkakApi.exportCapcutFallback(type, job.id, targetDir);

      if (electronAPI && typeof electronAPI.openCapcut === 'function') {
        electronAPI.openCapcut();
      }

      toast({
        title: '🎬 CapCut 내보내기 완료',
        description: `CapCut 프로젝트 '${res.project_name || job.video_filename || `job_${job.id}`}' 생성이 완료되었습니다.`
      });
    } catch (err: any) {
      console.error('CapCut export error:', err);
      toast({
        title: 'CapCut 내보내기 실패',
        description: err?.response?.data?.detail || err?.message || 'CapCut 프로젝트 생성 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBatchCapcut = async () => {
    let jobsToExport: any[] = [];
    let jobType = 'subtitle';
    if (activeTab === 'subtitle') {
      jobsToExport = subtitleJobs.filter(j => selectedSubtitleJobIds.includes(j.id));
      jobType = 'subtitle';
    } else if (activeTab === 'ttsdub') {
      jobsToExport = ttsDubJobs.filter(j => selectedTtsDubJobIds.includes(j.id));
      jobType = 'tts-dub';
    }

    if (jobsToExport.length === 0) {
      toast({ title: '안내', description: 'CapCut으로 내보낼 작업을 먼저 선택해주세요.' });
      return;
    }

    setIsExporting(true);
    let successCount = 0;

    for (const job of jobsToExport) {
      try {
        await handleExportSingleCapcut(job, jobType);
        successCount++;
      } catch (_) {}
    }

    setIsExporting(false);
    toast({
      title: '일괄 CapCut 내보내기 완료',
      description: `총 ${successCount}개의 영상 프로젝트가 CapCut으로 성공적으로 내보내졌습니다.`
    });
  };

  const currentSelectedCount = activeTab === 'subtitle' ? selectedSubtitleJobIds.length :
                               activeTab === 'ttsdub' ? selectedTtsDubJobIds.length : selectedClipJobIds.length;

  return (
    <div className="w-full max-w-[1700px] mx-auto p-2 sm:p-6 space-y-4 select-none animate-in fade-in duration-150 pb-16 sm:pb-4 text-foreground">
      {/* 🌟 1. 상단 마스터 컨트롤 헤더 바 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 w-full pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-xs">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  쇼츠 제작 스튜디오
                </h1>
                <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shrink-0">
                  Sovereign Production Factory
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                대본 자막 스타일(쨉쨉이+SFX), AI 대본+더빙, 주제별 클립 편집 및 템플릿 디자인을 결합한 일괄 생산 마스터 공장
              </p>
            </div>
          </div>
        </div>

        {/* 🎛️ 상단 툴바: 템플릿 디자인 선택기 & 수집 영상 보관함 & 엔진 상태 */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Template Selector */}
          <div className="flex items-center gap-1.5 bg-card px-2.5 py-1 rounded-xl border border-border/80 shadow-2xs">
            <LayoutTemplate className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">디자인 템플릿:</span>
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              className="h-7 text-xs bg-background border border-border rounded-lg px-2 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {availableTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shorts-template-studio')}
              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-0.5"
              title="쇼츠 템플릿 디자인 스튜디오로 이동"
            >
              <Sliders className="w-3 h-3" />
              <span>디자인 편집</span>
            </Button>
          </div>

          {/* 수집 영상 보관함 바로가기 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/gallery')}
            className="h-8 text-xs font-bold gap-1.5 bg-background hover:bg-accent border-border shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>수집 영상 보관함</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </Button>

          {/* Engine Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/50 border border-border/60 text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate max-w-[140px]">{engineStatus}</span>
          </div>
        </div>
      </div>

      {/* ===== Top Navigation Segmented Tab Buttons (Pixeling Style) ===== */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">작업 공정 선택:</span>
          <Badge variant="outline" className="text-xs bg-card">
            {activeTab === 'subtitle' && '🎬 쨉쨉이 + SFX 대본 자막 자동화'}
            {activeTab === 'ttsdub' && '🎙️ 화자 뮤트 & 고음질 TTS 멀티 더빙'}
            {activeTab === 'clipedit' && '✂️ 영상 주제 묶음 & 롱폼 하이라이트 분할'}
          </Badge>
        </div>

        {/* Top Segmented Tab Buttons */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 p-1 rounded-xl sm:rounded-2xl shadow-xs border bg-muted/40 border-border w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange('subtitle')}
            className={`px-3 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'subtitle'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>📝</span>
            <span className="truncate">자막 생성 (쨉쨉이+SFX)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('ttsdub')}
            className={`px-3 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ttsdub'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>🎙️</span>
            <span className="truncate">대본 + 더빙</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('clipedit')}
            className={`px-3 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'clipedit'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>✂️</span>
            <span className="truncate">클립 일괄 편집</span>
          </button>
        </div>
      </header>

      {/* ===== TAB 1: 자막 자동 생성 스튜디오 (쨉쨉이 + SFX 대본 스타일 5종 + 글로벌 번역) ===== */}
      {activeTab === 'subtitle' && (
        <SubtitleStudioTab
          jobs={subtitleJobs}
          selectedJobIds={selectedSubtitleJobIds}
          onToggleSelectJob={toggleSelectSubtitle}
          onToggleSelectAll={toggleSelectAllSubtitles}
          onRefreshJobs={loadSubtitleJobs}
          onOpenResult={job => {
            setActiveResultJob(job);
            setActiveResultType('subtitle');
            setResultModalOpen(true);
          }}
          onExportCapcut={job => handleExportSingleCapcut(job, 'subtitle')}
          onDeleteJob={handleDeleteSubtitle}
        />
      )}

      {/* ===== TAB 2: AI 대본 + 더빙 스튜디오 (TTSSettingsDialog & 보이스 프리셋) ===== */}
      {activeTab === 'ttsdub' && (
        <TtsDubStudioTab
          jobs={ttsDubJobs}
          selectedJobIds={selectedTtsDubJobIds}
          onToggleSelectJob={toggleSelectTtsDub}
          onToggleSelectAll={toggleSelectAllTtsDub}
          onRefreshJobs={loadTtsDubJobs}
          onOpenResult={job => {
            setActiveResultJob(job);
            setActiveResultType('tts-dub');
            setResultModalOpen(true);
          }}
          onExportCapcut={job => handleExportSingleCapcut(job, 'tts-dub')}
          onDeleteJob={handleDeleteTtsDub}
        />
      )}

      {/* ===== TAB 3: 클립 일괄 편집 스튜디오 (주제별 연관 영상 묶음 & 롱폼 하이라이트 분할) ===== */}
      {activeTab === 'clipedit' && (
        <ClipEditStudioTab
          jobs={clipJobs}
          selectedJobIds={selectedClipJobIds}
          onToggleSelectJob={toggleSelectClip}
          onRefreshJobs={loadClipJobs}
          onOpenResult={job => {
            setActiveResultJob(job);
            setActiveResultType('clip-edit');
            setResultModalOpen(true);
          }}
          onExportCapcut={job => handleExportSingleCapcut(job, 'clip-edit')}
          onDeleteJob={handleDeleteClip}
        />
      )}

      {/* ===== Floating Batch Action Bar ===== */}
      <FloatingBatchActionBar
        selectedCount={currentSelectedCount}
        onExportCapcut={handleExportBatchCapcut}
        onSendToPixeling={() => handleSendToPixeling()}
        onCopyMeta={() => handleCopyPixelingMeta()}
        onDeleteSelected={handleDeleteSelected}
        isExporting={isExporting}
      />

      {/* ===== Result Detail Inspector Modal (상황설명, 쨉쨉이 자막, 대사번역, 효과음믹스, BGM, 대본 상세 검토) ===== */}
      <DdalkkakResultModal
        open={resultModalOpen}
        onOpenChange={setResultModalOpen}
        job={activeResultJob}
        jobType={activeResultType}
        onExportCapcut={job => handleExportSingleCapcut(job, activeResultType)}
        onSendToPixeling={job => handleSendToPixeling([job])}
      />
    </div>
  );
};

export default ShortsProductionStudio;
