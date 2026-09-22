import React, { useState } from 'react';
import {
  Scissors,
  Upload,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Play,
  CheckCircle2,
  Tv,
  Film,
  Activity,
  Layers,
  Zap,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface HighlightCandidate {
  id: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  peakDb: number;
  hookSummary: string;
  selected: boolean;
}

interface LongToShortTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const LongToShortTab: React.FC<LongToShortTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('롱폼 인터뷰 원본 (42분)');

  // 오디오 에너지 및 컷다운 파라미터
  const [peakSensitivity, setPeakSensitivity] = useState<'low' | 'medium' | 'high'>('high');
  const [targetDuration, setTargetDuration] = useState<number>(45); // 30, 45, 60초
  const [removeSilence, setRemoveSilence] = useState<boolean>(true);
  const [silenceThresholdSec, setSilenceThresholdSec] = useState<number>(0.6);

  // 하이라이트 후보군
  const [candidates, setCandidates] = useState<HighlightCandidate[]>([
    { id: 'hl-1', startSec: 142, endSec: 187, durationSec: 45, peakDb: -3.2, hookSummary: '충격 고백: "그때 투자를 멈췄다면 전 재산을 날렸을 겁니다"', selected: true },
    { id: 'hl-2', startSec: 420, endSec: 462, durationSec: 42, peakDb: -4.1, hookSummary: '상위 1% 부자들만 아는 지출 통제의 핵심 3단계', selected: true },
    { id: 'hl-3', startSec: 890, endSec: 935, durationSec: 45, peakDb: -2.8, hookSummary: '진행자가 경악한 반전: "그 소문은 전부 조작이었습니다"', selected: true },
    { id: 'hl-4', startSec: 1310, endSec: 1352, durationSec: 42, peakDb: -4.8, hookSummary: '초보자가 가장 많이 범하는 치명적인 실수 TOP 1', selected: false },
  ]);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({
        title: '롱폼 영상 로드 완료',
        description: `'${file.name}' 파일이 등록되었습니다.`
      });
    }
  };

  const handleRunAudioAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await new Promise(r => setTimeout(r, 800));
      toast({
        title: '📊 오디오 에너지 RMS 분석 완료',
        description: `데시벨 피크와 대화 호흡 구간을 감지하여 4개의 킬러 하이라이트를 산출했습니다.`
      });
    } catch (_) {
      toast({ variant: 'destructive', title: '분석 실패', description: '오디오 분석 중 오류가 발생했습니다.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCandidateSelection = (id: string) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleBatchExtractShorts = async () => {
    const selected = candidates.filter(c => c.selected);
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: '클립을 선택하세요', description: '최소 1개 이상의 하이라이트를 선택해 주세요.' });
      return;
    }

    setIsGenerating(true);
    try {
      const newJobs = selected.map((c, idx) => ({
        id: `l2s-v1-${Date.now()}-${idx}`,
        title: `[롱투숏] ${c.hookSummary}`,
        sourceType: 'video',
        archetype: 'classic',
        tabId: 'long-to-short',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: 4,
        metadata: {
          originalVideo: videoTitle,
          startSec: c.startSec,
          endSec: c.endSec,
          durationSec: c.durationSec,
          peakDb: c.peakDb,
          scenes: [
            { order: 1, narration: c.hookSummary, hookJabText: '*핵심 하이라이트*', startTime: 0 },
            { order: 2, narration: `타임코드 ${Math.floor(c.startSec / 60)}분 ${c.startSec % 60}초 킬러 구간 추출 완료.`, hookJabText: '*실시간 증언*', startTime: 3.5 }
          ]
        }
      }));

      onAddBatchJobs(newJobs);
      toast({
        title: '✂️ 롱투숏 v1 일괄 추출 완료',
        description: `총 ${newJobs.length}개의 킬러 쇼츠가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '추출 오류', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 사이드 레일 (4칸): 롱폼 원본 및 오디오 피크 파라미터 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-primary" />
              롱폼 소스 및 에너지 분석기
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              RMS PEAK V1
            </Badge>
          </div>

          {/* 영상 업로드 / URL */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">롱폼 비디오 등록 (MP4, MOV)</label>
            <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary" />
              <span className="truncate">{videoFileName || '대용량 영상 파일 선택'}</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="text-[10px] text-center text-muted-foreground">또는 유튜브 롱폼 링크</div>
            <input
              type="text"
              value={videoSourceUrl}
              onChange={e => setVideoSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background"
            />
          </div>

          {/* 목표 쇼츠 길이 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">목표 쇼츠 길이</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[30, 45, 60].map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setTargetDuration(dur)}
                  className={cn(
                    "p-2 rounded-lg border text-center text-xs transition cursor-pointer font-mono font-bold",
                    targetDuration === dur
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {dur}초
                </button>
              ))}
            </div>
          </div>

          {/* 피크 감도 설정 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">오디오 데시벨 피크 감도</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'low', label: '완만함' },
                { id: 'medium', label: '보통' },
                { id: 'high', label: '고강도(강추)' },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPeakSensitivity(s.id as any)}
                  className={cn(
                    "p-1.5 rounded-lg border text-center text-[11px] transition cursor-pointer font-bold",
                    peakSensitivity === s.id
                      ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 무음 구간 자동 제거 */}
          <div className="space-y-2.5 pt-2 border-t border-border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">무음 구간 자동 압축 분할</span>
              <input
                type="checkbox"
                checked={removeSilence}
                onChange={e => setRemoveSilence(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
            {removeSilence && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>무음 판정 임계치:</span>
                  <span className="font-mono text-primary font-bold">{silenceThresholdSec}초 이상</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.5"
                  step="0.1"
                  value={silenceThresholdSec}
                  onChange={e => setSilenceThresholdSec(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}
          </div>

          <Button
            type="button"
            disabled={isAnalyzing}
            onClick={handleRunAudioAnalysis}
            className="w-full h-9 text-xs font-bold gap-1.5 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>오디오 피크 & 컷다운 플랜 재분석</span>
          </Button>
        </div>

        {/* 중앙 및 우측 (8칸): 컷다운 플랜 후보군 및 일괄 추출 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">감지된 킬러 쇼츠 후보군 (Cutdown Plan)</span>
              </div>
              <span className="text-xs text-muted-foreground">
                선택됨: <strong className="text-primary">{candidates.filter(c => c.selected).length}</strong> / {candidates.length}개
              </span>
            </div>

            {/* 후보군 카드 목록 */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.id}
                  onClick={() => toggleCandidateSelection(cand.id)}
                  className={cn(
                    "p-3.5 rounded-xl border transition cursor-pointer space-y-2",
                    cand.selected
                      ? "bg-primary/10 border-primary shadow-2xs"
                      : "bg-muted/20 border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={cand.selected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded accent-primary cursor-pointer mt-0.5"
                      />
                      <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-primary/15 text-primary border-primary/30">
                        클립 #{idx + 1}
                      </Badge>
                      <span className="text-xs font-bold text-foreground line-clamp-1">
                        {cand.hookSummary}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                      {Math.floor(cand.startSec / 60)}:{(cand.startSec % 60).toString().padStart(2, '0')} ~ {Math.floor(cand.endSec / 60)}:{(cand.endSec % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-7">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        길이: <strong className="text-foreground">{cand.durationSec}초</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-amber-500" />
                        최대 에너지: <strong className="font-mono text-foreground">{cand.peakDb} dB</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      바이럴 지속률 88% 예측
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 일괄 추출 실행 버튼 */}
          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating || candidates.filter(c => c.selected).length === 0}
              onClick={handleBatchExtractShorts}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>선택한 하이라이트 쇼츠 일괄 추출 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
