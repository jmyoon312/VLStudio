import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Layers, 
  Download, 
  RefreshCw, 
  FolderPlus,
  Play,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { ddalkkakApi } from '../services/ddalkkakApi';
import { ExportModal } from '../features/flow2capcut/components/ExportModal';

interface BatchItem {
  id: string;
  name: string;
  file?: File;
  url?: string;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  jobId?: number;
}

const DdalkkakUI: React.FC = () => {
  const [iframeSrc] = useState<string>('./ddalkkak/index.html');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Batch Multi-Video Processing Drawer / Panel state
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchMode, setBatchMode] = useState<'subtitle' | 'ttsdub' | 'clip'>('subtitle');
  const [batchUrlsInput, setBatchUrlsInput] = useState('');
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // CapCut Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState<'saving' | 'launching' | null>(null);
  const [currentExportJob, setCurrentExportJob] = useState<{ type: string; id: number } | null>(null);

  // Listen to postMessage from embedded Ddalkkak iframe (e.g. CapCut Export requests)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'DDALKKAK_EXPORT_CAPCUT') {
        const { jobType, jobId } = event.data;
        setCurrentExportJob({ type: jobType, id: Number(jobId) });
        setIsExportModalOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExportCapcut = async (settings: any) => {
    if (!currentExportJob || isExporting) return;
    setIsExporting(true);
    setExportPhase('saving');

    try {
      const { type, id } = currentExportJob;
      const targetPath = settings.capcutProjectNumber?.trim() || '';
      const isElectron = !!window.electronAPI?.writeCapcutProject;

      if (isElectron) {
        if (!targetPath) {
          toast.error('내보내기 경로를 설정해주세요.');
          return;
        }
        const jobData = await ddalkkakApi.getCapcutData(type, id);
        const { generateCapcutProject } = await import('../features/flow2capcut/exporters/capcutLocalGenerator');

        const projectForGenerator = {
          name: jobData.project_name || `Ddalkkak_${type}_${id}`,
          format: 'portrait',
          scenes: [{
            id: 'scene_1',
            video_path: jobData.video_path,
            video_duration: jobData.duration_sec,
            image_duration: jobData.duration_sec,
            subtitle_ko: '',
            subtitle_en: '',
          }],
          videos: [],
          _ddalkkak: {
            subtitles: jobData.subtitles || [],
            title: jobData.title || null,
            audio_path: jobData.audio_path || null,
            duration_sec: jobData.duration_sec,
          }
        };

        const { draftContent, draftMetaInfo, timelineLayout, extraFiles, mediaFiles } =
          await (generateCapcutProject as any)(projectForGenerator, {
            targetPath,
            preset: settings.preset || 'standard',
          });

        const res = await window.electronAPI!.writeCapcutProject!({
          targetPath,
          draftContent,
          draftMetaInfo,
          timelineLayout,
          extraFiles,
          mediaFiles,
        });

        if (!res.success) throw new Error(res.error || 'CapCut 프로젝트 저장 실패');

        setExportPhase('launching');
        if (settings.autoLaunch !== false && window.electronAPI?.openCapcut) {
          await window.electronAPI.openCapcut(targetPath);
        }
        toast.success('🎉 CapCut 프로젝트로 완벽하게 내보냈습니다!');
      } else {
        await ddalkkakApi.exportCapcutFallback(type, id, targetPath);
        toast.success('✅ CapCut 프로젝트 내보내기 완료!');
      }

      setIsExportModalOpen(false);
    } catch (err: any) {
      toast.error(`CapCut 내보내기 오류: ${err.message}`);
    } finally {
      setIsExporting(false);
      setExportPhase(null);
    }
  };

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      toast.info('딸깍 자동 생성 화면을 새로고침했습니다.');
    }
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: BatchItem[] = Array.from(files).map((f) => ({
      id: 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: f.name,
      file: f,
      status: 'idle',
      progress: 0,
    }));
    setBatchItems((prev) => [...prev, ...newItems]);
    toast.success(`${newItems.length}개 영상 파일이 일괄 작업 큐에 추가되었습니다.`);
  };

  const handleAddUrlsToBatch = () => {
    if (!batchUrlsInput.trim()) return;
    const lines = batchUrlsInput.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newItems: BatchItem[] = lines.map((u) => ({
      id: 'batch_url_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: u,
      url: u,
      status: 'idle',
      progress: 0,
    }));
    setBatchItems((prev) => [...prev, ...newItems]);
    setBatchUrlsInput('');
    toast.success(`${newItems.length}개 영상 URL이 일괄 작업 큐에 추가되었습니다.`);
  };

  const startBatchExecution = async () => {
    if (batchItems.length === 0 || isBatchRunning) return;
    setIsBatchRunning(true);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.status === 'completed') continue;

      setBatchItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'processing', message: '작업 등록 중...' } : it))
      );

      try {
        if (item.file) {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('style', 'shorts');
          if (batchMode === 'subtitle') {
            const res = await ddalkkakApi.createSubtitleJob(fd);
            setBatchItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, status: 'completed', progress: 100, jobId: res.job_id, message: '자막 작업 등록 완료' } : it))
            );
          } else if (batchMode === 'clip') {
            const res = await ddalkkakApi.createClipEditJob(fd);
            setBatchItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, status: 'completed', progress: 100, jobId: res.job_id, message: '클립 작업 등록 완료' } : it))
            );
          }
        } else if (item.url) {
          if (batchMode === 'subtitle') {
            await fetch('http://127.0.0.1:8000/api/ddalkkak/api/subtitle/download-from-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls: item.url }),
            });
            setBatchItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, status: 'completed', progress: 100, message: 'URL 다운로드 및 등록 완료' } : it))
            );
          }
        }
      } catch (err: any) {
        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'failed', message: err.message || '실패' } : it))
        );
      }
    }

    setIsBatchRunning(false);
    toast.success('🎉 모든 일괄 작업이 등록 완료되었습니다. 메인 화면에서 진행 상황을 확인하세요.');
    reloadIframe();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0F17] text-slate-100 overflow-hidden relative">
      <div className="h-12 border-b border-slate-800 bg-[#0E131F] px-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-amber-500 flex items-center justify-center font-bold text-xs">
            🐝
          </div>
          <span className="font-bold text-sm text-slate-200">딸깍 자동 생성 스튜디오 (Ddalkkak Pro)</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
            100% Full Core Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchOpen(!isBatchOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isBatchOpen 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>다중 영상 일괄 작업 ({batchItems.length})</span>
          </button>

          <button
            onClick={reloadIframe}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 border border-slate-700"
            title="화면 새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative overflow-hidden bg-stone-950">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0"
          title="Ddalkkak Studio"
          allow="clipboard-read; clipboard-write; microphone; camera"
        />
      </div>

      {isBatchOpen && (
        <div className="absolute right-0 top-12 bottom-0 w-96 bg-[#111625]/95 backdrop-blur-md border-l border-slate-800 shadow-2xl z-30 flex flex-col p-4 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">다중 영상 일괄 작업 큐</h3>
            </div>
            <button onClick={() => setIsBatchOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 flex-1 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs text-slate-400 mb-1">작업 유형 선택</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBatchMode('subtitle')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium ${batchMode === 'subtitle' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  📝 자막 자동 생성
                </button>
                <button
                  type="button"
                  onClick={() => setBatchMode('clip')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium ${batchMode === 'clip' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  ✂️ 클립 구간 편집
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">여러 영상 파일 드롭 / 선택</label>
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="w-full text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">여러 URL 붙여넣기 (한 줄에 하나씩)</label>
              <textarea
                value={batchUrlsInput}
                onChange={(e) => setBatchUrlsInput(e.target.value)}
                placeholder="https://youtube.com/shorts/...&#10;https://tiktok.com/..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 resize-none"
              />
              <button
                type="button"
                onClick={handleAddUrlsToBatch}
                className="mt-1 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
              >
                + URL 일괄 추가
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span>등록된 작업 목록 ({batchItems.length})</span>
                {batchItems.length > 0 && (
                  <button onClick={() => setBatchItems([])} className="text-rose-400 hover:underline text-[11px]">
                    전체 비우기
                  </button>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {batchItems.map((item, idx) => (
                  <div key={item.id} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 truncate">
                      <div className="text-slate-200 truncate font-mono text-[11px]">{idx + 1}. {item.name}</div>
                      {item.message && <div className="text-[10px] text-amber-400">{item.message}</div>}
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      item.status === 'completed' ? 'bg-emerald-900/60 text-emerald-300' :
                      item.status === 'failed' ? 'bg-rose-900/60 text-rose-300' :
                      item.status === 'processing' ? 'bg-blue-900/60 text-blue-300' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                {batchItems.length === 0 && (
                  <div className="text-center py-6 text-slate-500 text-xs">큐가 비어 있습니다.</div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 mt-2">
            <button
              onClick={startBatchExecution}
              disabled={isBatchRunning || batchItems.length === 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg shadow-amber-500/20"
            >
              {isBatchRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              {isBatchRunning ? '일괄 순차 처리 중...' : `일괄 작업 시작 (${batchItems.length}개)`}
            </button>
          </div>
        </div>
      )}

      {/* CapCut Export Modal Integration */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => !isExporting && setIsExportModalOpen(false)}
        onExport={handleExportCapcut}
        allowEmptyPath={true}
        loading={isExporting}
        exportPhase={exportPhase}
      />
    </div>
  );
};

export default DdalkkakUI;
