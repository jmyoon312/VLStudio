import React, { useState } from 'react';
import {
  Scissors,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  Film,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ddalkkakApi, ClipEditJob, ClipSuggestion } from '@/services/ddalkkakApi';

interface ClipEditStudioTabProps {
  jobs: ClipEditJob[];
  selectedJobIds: number[];
  onToggleSelectJob: (id: number) => void;
  onRefreshJobs: () => void;
  onOpenResult: (job: ClipEditJob) => void;
  onExportCapcut: (job: ClipEditJob) => void;
  onDeleteJob: (id: number) => void;
}

export const ClipEditStudioTab: React.FC<ClipEditStudioTabProps> = ({
  jobs,
  selectedJobIds,
  onToggleSelectJob,
  onRefreshJobs,
  onOpenResult,
  onExportCapcut,
  onDeleteJob,
}) => {
  const { toast } = useToast();

  const [clipTopic, setClipTopic] = useState<string>('');
  const [clipUrls, setClipUrls] = useState<string>('');
  const [suggestions, setSuggestions] = useState<ClipSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Suggest Keywords
  const handleSuggest = async () => {
    if (!clipTopic.trim()) {
      toast({ title: '안내', description: '영상 주제를 먼저 입력해주세요.' });
      return;
    }
    setIsSuggesting(true);
    try {
      const res = await ddalkkakApi.suggestClipKeywords(clipTopic.trim());
      setSuggestions(res);
      toast({ title: '검색어 추천 완료', description: `총 ${res.length}개의 최적 검색어가 추천되었습니다.` });
    } catch (err: any) {
      toast({ title: '오류', description: '검색어 추천에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsSuggesting(false);
    }
  };

  // Start Clip Edit
  const handleStartClipEdit = async () => {
    if (!clipTopic.trim()) {
      toast({ title: '안내', description: '영상 주제를 입력해주세요.' });
      return;
    }
    if (!clipUrls.trim()) {
      toast({ title: '안내', description: '유튜브 / 영상 URL을 입력해주세요.' });
      return;
    }

    setIsProcessing(true);
    try {
      await ddalkkakApi.createClipJob({
        topic: clipTopic.trim(),
        urls: clipUrls.trim()
      });
      toast({ title: '클립 일괄 편집 작업 등록 완료', description: '영상 다운로드 및 하이라이트 분할이 시작되었습니다.' });
      setClipUrls('');
      onRefreshJobs();
    } catch (err: any) {
      toast({ title: '오류', description: '클립 작업 등록에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* 👈 좌측 클립 입력 설정 (5열) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="border rounded-3xl p-5 space-y-4 shadow-sm bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <div className="text-xs text-stone-600 dark:text-stone-300">
            긴 유튜브 영상 링크나 영상 파일을 넣으면 <b>AI가 하이라이트 구간을 자동으로 탐지</b>하여 쇼츠 클립으로 편집합니다.
          </div>

          {/* 주제 입력 */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-stone-800 dark:text-stone-200">
              📌 영상 주제 (필수)
            </label>
            <input
              type="text"
              value={clipTopic}
              onChange={e => setClipTopic(e.target.value)}
              placeholder="예: 김연아 올림픽 레전드 경기 하이라이트"
              className="w-full border rounded-xl px-3 py-2.5 text-xs bg-stone-50 border-stone-300 text-stone-900 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* 유튜브 URL 또는 영상 링크 */}
          <div>
            <label className="block text-xs font-bold mb-1.5 text-stone-800 dark:text-stone-200">
              🔗 유튜브 / 원본 영상 URL (줄바꿈 구분)
            </label>
            <textarea
              value={clipUrls}
              onChange={e => setClipUrls(e.target.value)}
              rows={3}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full border rounded-xl p-2.5 text-xs resize-none bg-stone-50 border-stone-300 text-stone-900 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* 검색어 추천 버튼 & 결과 */}
          <div className="p-3.5 border rounded-2xl space-y-2 bg-stone-50 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800">
            <Button
              type="button"
              onClick={handleSuggest}
              disabled={isSuggesting || !clipTopic.trim()}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-stone-400/20 text-white text-xs font-bold rounded-xl h-10 transition-all flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSuggesting ? '추천 검색어 생성 중... (~15초)' : '🔍 이 주제로 쓸 영상 검색어 추천받기'}</span>
            </Button>

            {suggestions.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-2.5 border rounded-xl text-xs bg-white border-stone-200 text-stone-800 dark:bg-stone-800/80 dark:border-stone-700 dark:text-stone-300 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {(s.year ? s.year + ' · ' : '') + (s.event || '')}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] truncate">🔎 {s.query}</div>
                    </div>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.query || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-600 dark:text-violet-400 hover:underline text-[11px] font-bold shrink-0 flex items-center gap-0.5"
                    >
                      <span>검색</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✂️ 클립 편집 시작 버튼 */}
          <Button
            type="button"
            onClick={handleStartClipEdit}
            disabled={isProcessing || !clipTopic.trim()}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-stone-400/20 text-white font-bold text-xs shadow-md rounded-xl h-11 transition-all flex items-center justify-center gap-1.5"
          >
            <Scissors className="w-4 h-4" />
            <span>{isProcessing ? '클립 분석 및 다운로드 중...' : '✂️ 클립 일괄 편집 시작'}</span>
          </Button>
        </div>
      </div>

      {/* 👉 우측 클립 작업 큐 & 라이브러리 (7열) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="border rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
          <div className="p-3.5 border-b flex items-center justify-between border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
                <span>📊</span> <span>클립 편집 작업 큐 & 라이브러리</span>
              </h3>
              <Badge variant="outline" className="text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 font-bold">
                {jobs.length}개 작업
              </Badge>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onRefreshJobs}
              className="h-7 w-7 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* 작업 행 목록 */}
          <div className="divide-y max-h-[620px] overflow-y-auto divide-stone-100 dark:divide-stone-800/60">
            {jobs.map(job => {
              const isDone = job.status === 'completed' || job.status === 'done';
              const isFailed = job.status === 'failed';

              return (
                <div
                  key={job.id}
                  className="p-3 transition-colors flex items-center justify-between gap-3 text-xs hover:bg-stone-50 dark:hover:bg-stone-800/30"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 text-sm bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      ✂️
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate text-xs text-stone-800 dark:text-stone-100">
                        {job.song_title || job.topic || `클립 작업 #${job.id}`}
                      </div>
                      <div className="text-[11px] flex items-center gap-2 mt-0.5 text-stone-500 dark:text-stone-400">
                        <span className="font-mono">
                          {job.created_at ? new Date(job.created_at).toLocaleTimeString('ko-KR') : ''}
                        </span>
                        <span>·</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isDone
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : isFailed
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-purple-500/10 text-purple-500 border border-purple-500/20 animate-pulse'
                          }`}
                        >
                          {isDone ? '완료' : isFailed ? '오류' : '클립 분할 중'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 개별 액션 버튼들 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenResult(job)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      <span>결과 보기</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onExportCapcut(job)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-7 px-2.5 rounded-lg shadow-2xs"
                    >
                      <Film className="w-3 h-3 mr-1" />
                      <span>CapCut</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onDeleteJob(job.id)}
                      className="h-7 w-7 text-stone-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {jobs.length === 0 && (
              <div className="p-8 text-center text-xs text-stone-400 dark:text-stone-500">
                등록된 클립 일괄 편집 작업이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
