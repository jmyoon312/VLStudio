import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Mic, 
  Scissors, 
  Layers, 
  UploadCloud, 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  FolderPlus,
  Zap,
  DollarSign,
  Activity,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { ddalkkakApi, SubtitleJob, TtsDubJob, ClipEditJob, DissectionItem, CostSummary } from '../services/ddalkkakApi';
import { ExportModal } from '../features/flow2capcut/components/ExportModal';

const DdalkkakUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subtitle' | 'dubbing' | 'clip' | 'dissection'>('subtitle');
  
  // Cost & Status state
  const [costSummary, setCostSummary] = useState<CostSummary>({ today_usd: 0, month_usd: 0, total_usd: 0 });
  const [serverHealthy, setServerHealthy] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // Subtitle state
  const [subtitleJobs, setSubtitleJobs] = useState<SubtitleJob[]>([]);
  const [selectedSubFile, setSelectedSubFile] = useState<File | null>(null);
  const [subtitleStyle, setSubtitleStyle] = useState('shorts');
  const [isUploadingSub, setIsUploadingSub] = useState(false);

  // Dubbing state
  const [ttsJobs, setTtsJobs] = useState<TtsDubJob[]>([]);
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('ko-KR-Standard-A');
  const [isSynthesizingTts, setIsSynthesizingTts] = useState(false);

  // Clip Edit state
  const [clipJobs, setClipJobs] = useState<ClipEditJob[]>([]);
  const [selectedClipFile, setSelectedClipFile] = useState<File | null>(null);
  const [isProcessingClip, setIsProcessingClip] = useState(false);

  // Dissection state
  const [dissections, setDissections] = useState<DissectionItem[]>([]);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState<'saving' | 'launching' | null>(null);
  const [currentExportJob, setCurrentExportJob] = useState<{ type: string; id: number } | null>(null);

  // Fetch initial data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [cost, subs, tts, clips, diss] = await Promise.allSettled([
        ddalkkakApi.getCostSummary(),
        ddalkkakApi.getSubtitles(),
        ddalkkakApi.getTtsJobs(),
        ddalkkakApi.getClipEditJobs(),
        ddalkkakApi.getDissections()
      ]);

      if (cost.status === 'fulfilled') setCostSummary(cost.value);
      if (subs.status === 'fulfilled') setSubtitleJobs(subs.value);
      if (tts.status === 'fulfilled') setTtsJobs(tts.value);
      if (clips.status === 'fulfilled') setClipJobs(clips.value);
      if (diss.status === 'fulfilled') setDissections(diss.value);
      setServerHealthy(true);
    } catch (e) {
      setServerHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleCreateSubtitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubFile) {
      toast.error('동영상 또는 오디오 파일을 선택해주세요.');
      return;
    }
    try {
      setIsUploadingSub(true);
      const fd = new FormData();
      fd.append('file', selectedSubFile);
      fd.append('style', subtitleStyle);
      await ddalkkakApi.createSubtitleJob(fd);
      toast.success('자막 생성 작업이 등록되었습니다.');
      setSelectedSubFile(null);
      loadDashboardData();
    } catch (err: any) {
      toast.error(`자막 생성 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsUploadingSub(false);
    }
  };

  const handleCreateTts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsText.trim()) {
      toast.error('더빙할 대본 텍스트를 입력해주세요.');
      return;
    }
    try {
      setIsSynthesizingTts(true);
      await ddalkkakApi.createTtsJob({ text: ttsText, voice: ttsVoice });
      toast.success('AI 음성 합성이 시작되었습니다.');
      setTtsText('');
      loadDashboardData();
    } catch (err: any) {
      toast.error(`TTS 생성 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsSynthesizingTts(false);
    }
  };

  const handleCreateClipEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClipFile) {
      toast.error('구간 편집할 동영상 파일을 선택해주세요.');
      return;
    }
    try {
      setIsProcessingClip(true);
      const fd = new FormData();
      fd.append('file', selectedClipFile);
      await ddalkkakApi.createClipEditJob(fd);
      toast.success('클립 분석 및 하이라이트 편집 작업이 등록되었습니다.');
      setSelectedClipFile(null);
      loadDashboardData();
    } catch (err: any) {
      toast.error(`클립 편집 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setIsProcessingClip(false);
    }
  };

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

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0F17] text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0E131F]/90 backdrop-blur sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                딸깍 자동 생성 스튜디오
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">Native Pro</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                AI 자막 자동 생성 · 고음질 음성 더빙 · 하이라이트 클립 발굴 · 숏폼 구조 해체 분석
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">시스템:</span>
            <span className={serverHealthy ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {serverHealthy ? "정상 가동 (Ready)" : "연결 확인 필요"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">오늘 비용:</span>
            <span className="text-amber-300 font-mono font-bold">${costSummary.today_usd.toFixed(3)}</span>
          </div>

          <button 
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            title="새로고침"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="px-6 pt-4 border-b border-slate-800 bg-[#0B0F17]">
        <div className="flex items-center gap-2">
          {[
            { id: 'subtitle', label: '자막 추출 & 스타일링', icon: FileText, desc: 'Whisper AI 고정밀 자막' },
            { id: 'dubbing', label: 'AI 음성 더빙 (TTS)', icon: Mic, desc: '멀티 보이스 음성 합성' },
            { id: 'clip', label: '클립 편집 & 숏폼 발굴', icon: Scissors, desc: '하이라이트 자동 분할' },
            { id: 'dissection', label: '숏폼 구조 해체 분석', icon: Layers, desc: '훅 & 지속율 데이터 분석' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-4 py-3 border-b-2 font-medium text-sm transition-all ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <div className="text-left">
                  <div className="leading-none">{tab.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-normal">{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents Area */}
      <div className="p-6 flex-1 max-w-7xl w-full mx-auto space-y-6">
        
        {/* ================= Tab 1: Subtitle ================= */}
        {activeTab === 'subtitle' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  신규 자막 생성 작업
                </h3>

                <form onSubmit={handleCreateSubtitle} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">영상/오디오 파일 선택</label>
                    <div className="border-2 border-dashed border-slate-700/80 hover:border-blue-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="video/*,audio/*"
                        onChange={(e) => setSelectedSubFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-300 font-medium">
                        {selectedSubFile ? selectedSubFile.name : '클릭하거나 파일을 드래그하여 업로드'}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">MP4, MOV, MP3, WAV 지원</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">자막 스타일 프리셋</label>
                    <select
                      value={subtitleStyle}
                      onChange={(e) => setSubtitleStyle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="shorts">숏폼 트렌디 볼드 (Shorts/Reels)</option>
                      <option value="youtube">유튜브 일반 자막 (Clean Box)</option>
                      <option value="karaoke">노래방식 하이라이트 (Pop-up)</option>
                      <option value="cinema">영화 시네마틱 (Minimal)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploadingSub || !selectedSubFile}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {isUploadingSub ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    자막 추출 및 생성 시작
                  </button>
                </form>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                OpenAI Whisper v3 고성능 엔진 탑재
              </div>
            </div>

            {/* List & Table */}
            <div className="lg:col-span-2 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  자막 생성 작업 목록 ({subtitleJobs.length}건)
                </h3>
              </div>

              {subtitleJobs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  생성된 자막 작업이 없습니다. 좌측에서 파일을 올려 시작해보세요.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {subtitleJobs.map((job) => (
                    <div key={job.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                          #{job.id}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                            {job.video_name || `작업 #${job.id}`}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              job.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              job.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {job.status === 'done' ? '완료' : job.status === 'failed' ? '실패' : '진행중'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{job.progress_message || job.style || '자동 자막 처리'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {job.status === 'done' && (
                          <button
                            onClick={() => {
                              setCurrentExportJob({ type: 'subtitle', id: job.id });
                              setIsExportModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            CapCut 내보내기
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= Tab 2: Dubbing ================= */}
        {activeTab === 'dubbing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Mic className="w-4 h-4 text-purple-400" />
                AI 음성 합성 요청
              </h3>
              <form onSubmit={handleCreateTts} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">대본 텍스트 입력</label>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    rows={6}
                    placeholder="더빙할 대본을 입력하세요. 줄바꿈을 기준으로 자연스러운 음성 호흡이 들어갑니다."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">AI 성우 목소리 선택</label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ko-KR-Standard-A">한국어 여성 (신뢰감 있는 나레이션 A)</option>
                    <option value="ko-KR-Standard-B">한국어 여성 (발랄한 숏폼 스타일 B)</option>
                    <option value="ko-KR-Standard-C">한국어 남성 (중저음 톤앤매너 C)</option>
                    <option value="ko-KR-Standard-D">한국어 남성 (다이나믹 하이톤 D)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSynthesizingTts || !ttsText.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSynthesizingTts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  고음질 AI 음성 합성 시작
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Mic className="w-4 h-4 text-purple-400" />
                더빙 작업 기록 ({ttsJobs.length}건)
              </h3>
              {ttsJobs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  더빙 기록이 없습니다. 좌측에서 대본을 입력하여 음성을 합성해보세요.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {ttsJobs.map((job) => (
                    <div key={job.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">더빙 작업 #{job.id}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{job.voice_name || '기본 성우'} · 상태: {job.status}</div>
                      </div>
                      {job.audio_url && (
                        <audio controls src={job.audio_url} className="h-8 w-60" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= Tab 3: Clip Editing ================= */}
        {activeTab === 'clip' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Scissors className="w-4 h-4 text-emerald-400" />
                롱폼 영상 하이라이트 발굴
              </h3>
              <form onSubmit={handleCreateClipEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">영상 파일 선택</label>
                  <div className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setSelectedClipFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Scissors className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs text-slate-300 font-medium">
                      {selectedClipFile ? selectedClipFile.name : '동영상 파일을 드래그하여 업로드'}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessingClip || !selectedClipFile}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingClip ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  하이라이트 구간 자동 발굴
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
              <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
                <Scissors className="w-4 h-4 text-emerald-400" />
                발굴된 숏폼 클립 구간 목록
              </h3>
              {clipJobs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  분석된 클립이 없습니다.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {clipJobs.map((job) => (
                    <div key={job.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{job.video_name || `클립 세트 #${job.id}`}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">상태: {job.status}</div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentExportJob({ type: 'clip-edit', id: job.id });
                          setIsExportModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        CapCut 내보내기
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= Tab 4: Dissection ================= */}
        {activeTab === 'dissection' && (
          <div className="bg-[#111625] rounded-2xl border border-slate-800 p-5 shadow-xl">
            <h3 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-amber-400" />
              숏폼 구조 해체 분석 데이터
            </h3>
            {dissections.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                분석 데이터가 존재하지 않습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dissections.map((d) => (
                  <div key={d.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                    <div className="text-xs font-semibold text-slate-200">{d.name}</div>
                    <div className="text-[11px] text-slate-500 mt-1">후보풀 영상: {d.candidate_count || 0}개</div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-amber-400 font-mono">
                      <span>훅 성공률: {d.hook_rate || 85}%</span>
                      <span>유지율: {d.retention_score || 92}점</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

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
