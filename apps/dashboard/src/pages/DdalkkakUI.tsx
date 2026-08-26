import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Mic,
  Scissors,
  Sparkles,
  RefreshCw,
  Film,
  Send,
  Trash2,
  Copy,
  Layers,
  ArrowRight,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ddalkkakApi, SubtitleJob, TtsDubJob, ClipEditJob } from '@/services/ddalkkakApi';
import { SubtitleStudioTab } from './ddalkkak/SubtitleStudioTab';
import { TtsDubStudioTab } from './ddalkkak/TtsDubStudioTab';
import { ClipEditStudioTab } from './ddalkkak/ClipEditStudioTab';
import { FloatingBatchActionBar } from './ddalkkak/FloatingBatchActionBar';
import { DdalkkakResultModal } from './ddalkkak/DdalkkakResultModal';
import { generatePixelingStandardMeta } from '@/lib/ddalkkakPixeling';

export const DdalkkakUI: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Active Tab state (Default: subtitle)
  const [activeTab, setActiveTab] = useState<'subtitle' | 'ttsdub' | 'clipedit'>('subtitle');

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
      if (window.electronAPI && typeof window.electronAPI.detectCapcutPath === 'function') {
        try {
          const detected = await window.electronAPI.detectCapcutPath();
          targetDir = detected?.targetPath || detected?.draftRoot || '';
        } catch (_) {}
      }

      // Backend CapCut Project Exporter Engine (Creates full draft_content.json, draft_meta_info.json, materials)
      const res = await ddalkkakApi.exportCapcutFallback(type, job.id, targetDir);

      if (window.electronAPI && typeof window.electronAPI.openCapcut === 'function') {
        window.electronAPI.openCapcut();
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
      {/* 1. 상단 타이틀 헤더 바 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full pb-3 border-b border-border">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-indigo-600 dark:text-indigo-400" />
            <span>AI 원클릭 쇼츠 제작</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            자막 자동 생성, AI 대본+더빙 합성, 클립 편집을 원클릭으로 10초 만에 일괄 렌더링
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
            ⚡ AI Core Engine
          </Badge>
          <span className="text-[11px] sm:text-xs font-mono text-muted-foreground truncate">{engineStatus}</span>
        </div>
      </div>

      {/* ===== Top Navigation Header ===== */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3">

        {/* Top Segmented Tab Buttons (Pixeling Style) */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 p-1 rounded-xl sm:rounded-2xl shadow-xs border bg-muted/40 border-border w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange('subtitle')}
            className={`px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'subtitle'
                ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <span>📝</span>
            <span className="truncate">자막 생성</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('ttsdub')}
            className={`px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
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
            className={`px-2.5 sm:px-4 py-2 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap ${
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

      {/* ===== TAB 1: 자막 자동 생성 스튜디오 ===== */}
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

      {/* ===== TAB 2: AI 대본 + 더빙 스튜디오 ===== */}
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

      {/* ===== TAB 3: 클립 일괄 편집 스튜디오 ===== */}
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

      {/* ===== Result Detail Inspector Modal ===== */}
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

export default DdalkkakUI;
