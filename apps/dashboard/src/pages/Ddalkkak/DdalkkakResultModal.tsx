import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Copy,
  Film,
  Send,
  FileText,
  Music,
  Check,
  Sparkles,
  Layers,
  Volume2,
  Play,
  Pause,
  Clock,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ddalkkakApi } from '@/services/ddalkkakApi';
import { generateSmartSeoTags, generateSmartHashtags } from '@/lib/ddalkkakPixeling';

interface DdalkkakResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: any;
  jobType: 'subtitle' | 'tts-dub' | 'clip-edit';
  onExportCapcut: (job: any) => void;
  onSendToPixeling: (job: any) => void;
}

export const DdalkkakResultModal: React.FC<DdalkkakResultModalProps> = ({
  open,
  onOpenChange,
  job,
  jobType,
  onExportCapcut,
  onSendToPixeling,
}) => {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [detailedResult, setDetailedResult] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'situation' | 'jjap' | 'dialogue' | 'script' | 'audio'>('situation');

  // Fetch full detailed analysis result from backend when modal opens
  useEffect(() => {
    if (!open || !job?.id) return;
    setLoadingDetails(true);

    (async () => {
      try {
        if (jobType === 'subtitle') {
          const res = await ddalkkakApi.getSubtitleJob(job.id);
          setDetailedResult(res);
        } else if (jobType === 'tts-dub') {
          const res = await ddalkkakApi.getTtsJob(job.id);
          setDetailedResult(res);
        } else {
          const res = await ddalkkakApi.getClipJob(job.id);
          setDetailedResult(res);
        }
      } catch (err) {
        console.error('Failed to fetch detailed result:', err);
        setDetailedResult(job);
      } finally {
        setLoadingDetails(false);
      }
    })();
  }, [open, job, jobType]);

  if (!job) return null;

  // Safe parse result from detailedResult or job
  const currentData = detailedResult || job;
  let primary: any = {};
  let candidates: string[] = [];

  // Parse if result is string or object
  try {
    const rawRes = currentData.primary_analysis || (typeof currentData.result === 'string' ? JSON.parse(currentData.result) : (currentData.result || {}));
    primary = rawRes.primary || rawRes.primary_analysis || rawRes;
    candidates = currentData.title_candidates || primary.candidate_titles || [];
  } catch (_) {
    primary = {};
  }

  const copyText = (text: string, label: string, key: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      toast({ title: '복사 완료', description: `${label}이(가) 클립보드에 복사되었습니다.` });
      setTimeout(() => setCopiedKey(null), 1500);
    } catch (_) {
      toast({ title: '오류', description: '클립보드 복사에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 1. YouTube Title
  let youtubeTitle = primary.youtube_title || primary.main_hook_title || '';
  if (!youtubeTitle && candidates.length > 0) {
    youtubeTitle = candidates[0].replace(/^\([^)]+\)\s*/, '');
  }
  if (!youtubeTitle) {
    youtubeTitle = job.video_filename ? job.video_filename.replace(/\.[^/.]+$/, '') : (job.song_title || job.topic || '');
  }

  const langCode = (job.target_lang || 'KO').toUpperCase();

  // 2. YouTube Description (Body + Distinct Feed Hashtags)
  let youtubeDesc = primary.youtube_description || primary.description || '';
  const formattedHashtags = generateSmartHashtags(youtubeTitle, langCode, primary.hashtags);
  if (!youtubeDesc.includes('#') && formattedHashtags) {
    youtubeDesc = youtubeDesc ? `${youtubeDesc}\n\n${formattedHashtags}` : formattedHashtags;
  }
  if (!youtubeDesc) {
    youtubeDesc = `${youtubeTitle} 영상입니다. 끝까지 시청해주세요!\n\n${formattedHashtags}`;
  }

  // 3. YouTube Tags (Search / Suggested Algorithm Maximized, 15~20 Keywords, No #, Distinct from Hashtags)
  const youtubeTags = generateSmartSeoTags(youtubeTitle, langCode, primary.tags);

  // 4. Subtitles arrays
  const situationSubs: any[] = Array.isArray(primary.situation_subtitles) ? primary.situation_subtitles : [];
  const jjapSubs: any[] = Array.isArray(primary.jjap_jjap_i_subtitles) ? primary.jjap_jjap_i_subtitles : [];
  const dialogueSubs: any[] = Array.isArray(primary.dialogue_subtitles) ? primary.dialogue_subtitles : [];
  const fullScript = primary.full_script || primary.script || '';

  const token = localStorage.getItem('token') || '';
  const handleDownloadFile = (filename: string) => {
    const downloadUrl = currentData.subtitle_urls?.[filename] || `/api/ddalkkak/api/subtitle/${job.id}/download/${encodeURIComponent(filename)}?token=${token}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col p-0 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl">✨</span>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                  {job.video_filename || job.song_title || job.topic || `작업 #${job.id}`}
                </DialogTitle>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                    {job.target_lang || 'KO'}
                  </Badge>
                  <span>·</span>
                  <span>AI 자막/대본 심층 분석 완료</span>
                  {currentData.duration_sec && (
                    <>
                      <span>·</span>
                      <span>영상 길이: {currentData.duration_sec.toFixed(1)}초</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* 1. 생성된 핵심 결과물 대시보드 (클릭 시 하단 인스펙터에 즉시 내용 표시) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>AI가 생성한 6종 결과물 현황 (클릭 시 아래에서 즉시 확인)</span>
              </span>
              <span className="text-[11px] text-blue-500 font-medium">CapCut 프로젝트에 자동 포함됨</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* 상황 설명 자막 카드 */}
              <div
                onClick={() => setActiveViewerTab('situation')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeViewerTab === 'situation'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/30 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">상황 설명 자막</div>
                    <div className="text-[10px] opacity-70">{situationSubs.length > 0 ? `${situationSubs.length}개 구간 생성됨` : '01_상황설명.srt'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('01_상황설명.srt'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 쨉쨉이 강조 자막 카드 */}
              <div
                onClick={() => setActiveViewerTab('jjap')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeViewerTab === 'jjap'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">쨉쨉이 강조 자막</div>
                    <div className="text-[10px] opacity-70">{jjapSubs.length > 0 ? `${jjapSubs.length}개 쨉쨉이 생성됨` : '02_쨉쨉이.srt'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('02_쨉쨉이.srt'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 대사 번역 자막 카드 */}
              <div
                onClick={() => setActiveViewerTab('dialogue')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeViewerTab === 'dialogue'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">대사 번역 자막</div>
                    <div className="text-[10px] opacity-70">{dialogueSubs.length > 0 ? `${dialogueSubs.length}개 대사 번역됨` : '03_대사번역.srt'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('03_대사번역.srt'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 효과음 믹스 MP3 카드 */}
              <div
                onClick={() => setActiveViewerTab('audio')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeViewerTab === 'audio'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">효과음 믹스 MP3</div>
                    <div className="text-[10px] opacity-70">07_효과음믹스.mp3</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('07_효과음믹스.mp3'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 배경음악 BGM 카드 */}
              <div
                onClick={() => setActiveViewerTab('audio')}
                className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300 transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">배경음악 BGM</div>
                    <div className="text-[10px] opacity-70">06_배경음악.mp3</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('06_배경음악.mp3'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 풀 스토리 대본 카드 */}
              <div
                onClick={() => setActiveViewerTab('script')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeViewerTab === 'script'
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30 shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs truncate">풀 스토리 대본</div>
                    <div className="text-[10px] opacity-70">04_제목후보.txt</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDownloadFile('04_제목후보.txt'); }}
                  className="p-1 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 opacity-60 hover:opacity-100 cursor-pointer"
                  title="다운로드"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. 상세 뷰어 영역 (선택된 탭에 따라 실시간 내용 표시) */}
          <div className="border rounded-2xl p-4 bg-stone-50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="font-bold text-xs text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {activeViewerTab === 'situation' && '상황 설명 자막 타임라인'}
                  {activeViewerTab === 'jjap' && '쨉쨉이 강조 자막 타임라인'}
                  {activeViewerTab === 'dialogue' && '대사 번역 자막 타임라인'}
                  {activeViewerTab === 'script' && '풀 스토리 대본'}
                  {activeViewerTab === 'audio' && '오디오 미리듣기'}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (activeViewerTab === 'situation') {
                    copyText(situationSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '상황 자막', 'copy_active_tab');
                  } else if (activeViewerTab === 'jjap') {
                    copyText(jjapSubs.map(s => `[${s.start}s] ${s.text}`).join('\n'), '쨉쨉이 자막', 'copy_active_tab');
                  } else if (activeViewerTab === 'script') {
                    copyText(fullScript, '대본', 'copy_active_tab');
                  }
                }}
                className="h-6 px-2 text-[11px] text-blue-600 dark:text-blue-400"
              >
                <Copy className="w-3 h-3 mr-1" />
                <span>전체 복사</span>
              </Button>
            </div>

            {/* 상황 자막 목록 */}
            {activeViewerTab === 'situation' && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {situationSubs.length > 0 ? (
                  situationSubs.map((sub, sIdx) => (
                    <div key={sIdx} className="p-2 rounded-xl text-[11px] flex items-start gap-2.5 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                      <span className="text-blue-600 dark:text-blue-400 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                      <span className="font-medium text-stone-800 dark:text-stone-200">{sub.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-stone-400">생성된 상황 설명 자막이 없습니다.</div>
                )}
              </div>
            )}

            {/* 쨉쨉이 자막 목록 */}
            {activeViewerTab === 'jjap' && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {jjapSubs.length > 0 ? (
                  jjapSubs.map((sub, sIdx) => (
                    <div key={sIdx} className="p-2 rounded-xl text-[11px] flex items-start gap-2.5 bg-white dark:bg-stone-800/80 border border-amber-200 dark:border-amber-900/40">
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">⚡ {sub.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-stone-400">생성된 쨉쨉이 자막이 없습니다.</div>
                )}
              </div>
            )}

            {/* 대사 번역 자막 목록 */}
            {activeViewerTab === 'dialogue' && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {dialogueSubs.length > 0 ? (
                  dialogueSubs.map((sub, sIdx) => (
                    <div key={sIdx} className="p-2 rounded-xl text-[11px] flex items-start gap-2.5 bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold shrink-0">{sub.start?.toFixed(1)}s ~ {sub.end?.toFixed(1)}s</span>
                      <span className="font-medium text-stone-800 dark:text-stone-200">{sub.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-stone-400">생성된 대사 번역 자막이 없습니다.</div>
                )}
              </div>
            )}

            {/* 풀 스토리 대본 */}
            {activeViewerTab === 'script' && (
              <div className="p-3 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 whitespace-pre-line text-xs max-h-52 overflow-y-auto text-stone-800 dark:text-stone-200 leading-relaxed">
                {fullScript || '(풀 스토리 대본이 없습니다.)'}
              </div>
            )}

            {/* 오디오 플레이어 */}
            {activeViewerTab === 'audio' && (
              <div className="p-4 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 space-y-3 text-center">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400">🎵 생성된 효과음 믹스 오디오</div>
                <audio controls className="w-full h-9 mx-auto">
                  <source src={`/api/ddalkkak/api/subtitle/${job.id}/download/07_효과음믹스.mp3?token=${token}`} type="audio/mpeg" />
                </audio>
              </div>
            )}
          </div>

          {/* 3. 상단 메인 타이틀 후보군 8종 */}
          {candidates.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>🔝</span> <span>상단 고정 타이틀 후보군 (클릭 시 복사)</span>
                </span>
                <span className="text-[10px] text-stone-500">후킹 / 호기심 / 반전 스타일</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {candidates.map((t, idx) => {
                  const cleanT = t.replace(/^\([^)]+\)\s*/, '');
                  return (
                    <div
                      key={idx}
                      onClick={() => copyText(cleanT, '상단 타이틀', `title_${idx}`)}
                      className="p-2.5 rounded-xl cursor-pointer transition font-medium flex items-center justify-between bg-stone-100 hover:bg-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200"
                    >
                      <span className="truncate pr-2">{t}</span>
                      <span className="text-[10px] text-blue-500 font-bold flex items-center gap-0.5 shrink-0">
                        {copiedKey === `title_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>복사</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. 📺 YouTube 업로드 메타데이터 (제목, 설명(해시태그), 태그(콤마)) */}
          <div className="space-y-3 border rounded-2xl p-4 bg-stone-50 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📺</span> <span>YouTube 업로드 메타데이터</span>
              </span>
              <span className="text-[10px] text-stone-500">각 항목 클릭 시 1초 만에 복사</span>
            </div>

            {/* 유튜브 제목 */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                <span>동영상 제목 (YouTube Title)</span>
                <span className="text-blue-500 cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeTitle, '유튜브 제목', 'yt_title')}>
                  {copiedKey === 'yt_title' ? '✅ 복사됨' : '1클릭 복사'}
                </span>
              </div>
              <div
                onClick={() => copyText(youtubeTitle, '유튜브 제목', 'yt_title')}
                className="p-2.5 rounded-xl cursor-pointer font-bold truncate bg-white hover:bg-stone-100 border border-stone-200 text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border-stone-700 dark:text-stone-100 shadow-2xs"
              >
                {youtubeTitle}
              </div>
            </div>

            {/* 유튜브 설명 (해시태그 포함) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                <span>동영상 설명 (Description + 해시태그)</span>
                <span className="text-blue-500 cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}>
                  {copiedKey === 'yt_desc' ? '✅ 복사됨' : '1클릭 복사'}
                </span>
              </div>
              <div
                onClick={() => copyText(youtubeDesc, '유튜브 설명', 'yt_desc')}
                className="p-2.5 rounded-xl cursor-pointer whitespace-pre-line max-h-32 overflow-y-auto bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border-stone-700 dark:text-stone-200 shadow-2xs"
              >
                {youtubeDesc}
              </div>
            </div>

            {/* 유튜브 태그 키워드 (콤마 구분, 샵 없음) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700 dark:text-stone-300 mb-1">
                <span>동영상 태그 (Tags / Keywords - 콤마 구분)</span>
                <span className="text-blue-500 cursor-pointer hover:underline text-[10px]" onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}>
                  {copiedKey === 'yt_tags' ? '✅ 복사됨' : '1클릭 복사'}
                </span>
              </div>
              <div
                onClick={() => copyText(youtubeTags, '유튜브 태그', 'yt_tags')}
                className="p-2.5 rounded-xl cursor-pointer font-mono text-[11px] bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 dark:border-stone-700 dark:text-stone-200 shadow-2xs"
              >
                {youtubeTags}
              </div>
            </div>
          </div>
        </div>

        {/* 모달 푸터 액션 */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-between">
          <Button
            type="button"
            size="sm"
            onClick={() => onSendToPixeling(currentData)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>📤 픽셀링 메타 화면으로 전송</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onExportCapcut(currentData)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 CapCut 내보내기</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
