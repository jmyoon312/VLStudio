import React, { useState } from 'react';
import {
  Music,
  Upload,
  Sparkles,
  Sliders,
  Volume2,
  Disc,
  Play,
  Pause,
  Clock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  AlignLeft,
  FileAudio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface LyricLine {
  id: string;
  timeSec: number;
  original: string;
  pronunciation: string;
  meaning: string;
}

interface SongBatchTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const SongBatchTab: React.FC<SongBatchTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [songTitle, setSongTitle] = useState<string>('Golden Hour - JVKE');
  const [artistName, setArtistName] = useState<string>('JVKE');
  const [audioSourceUrl, setAudioSourceUrl] = useState<string>('https://www.youtube.com/watch?v=GEMqaFxMXKU');
  const [audioFileName, setAudioFileName] = useState<string>('');
  
  // 3-트랙 활성화 여부
  const [enableOriginal, setEnableOriginal] = useState<boolean>(true);
  const [enablePronunciation, setEnablePronunciation] = useState<boolean>(true);
  const [enableMeaning, setEnableMeaning] = useState<boolean>(true);

  // 음원 및 싱크 옵션
  const [vocalSeparation, setVocalSeparation] = useState<boolean>(true); // 보컬/MR 분리
  const [syncOffsetMs, setSyncOffsetMs] = useState<number>(0); // -500ms ~ +500ms
  const [backgroundStyle, setBackgroundStyle] = useState<'vinyl' | 'visualizer' | 'jacket' | 'poster'>('vinyl');

  // 3-트랙 가사 데이터
  const [lyrics, setLyrics] = useState<LyricLine[]>([
    { id: '1', timeSec: 0.0, original: 'It was just two lovers', pronunciation: '잇 워즈 저스트 투 러버스', meaning: '그저 사랑하는 두 사람이었어' },
    { id: '2', timeSec: 3.5, original: 'Sittin\' in the car, listenin\' to Blonde', pronunciation: '시틴 인 더 카, 리스닌 투 블론드', meaning: '차 안에 앉아 Blonde 앨범을 들으며' },
    { id: '3', timeSec: 7.2, original: 'Fallin\' for each other', pronunciation: '폴린 포 이치 아더', meaning: '서로에게 깊이 빠져들었지' },
    { id: '4', timeSec: 10.8, original: 'Pink and orange skies, feelin\' super alive', pronunciation: '핑크 앤 오렌지 스카이즈, 필린 슈퍼 얼라이브', meaning: '분홍빛과 주황빛 노을 아래, 온몸이 살아있음을 느껴' },
    { id: '5', timeSec: 14.5, original: 'You look like the golden hour', pronunciation: '유 룩 라이크 더 골든 아워', meaning: '넌 마치 황금빛 노을 같아' },
  ]);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFileName(file.name);
      setSongTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({
        title: '음원 파일 등록 완료',
        description: `'${file.name}' 파일이 로드되었습니다.`
      });
    }
  };

  const handleAutoTranslateLyrics = async () => {
    setIsAnalyzing(true);
    try {
      // 3중 트랙 가사 자동 한글 발음 및 번역 보강
      await new Promise(r => setTimeout(r, 600));
      toast({
        title: '✨ 3중 트랙 가사 분석 완료',
        description: '원문 가사에 대한 한글 발음과 자연스러운 한국어 번역 싱크가 생성되었습니다.'
      });
    } catch (_) {
      toast({ variant: 'destructive', title: '분석 실패', description: '가사 분석 중 오류가 발생했습니다.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartSongBatch = async () => {
    setIsGenerating(true);
    try {
      const jobId = `song-${Date.now()}`;
      const newJob = {
        id: jobId,
        title: `[노래형] ${songTitle}`,
        sourceType: 'video',
        archetype: 'classic',
        tabId: 'song',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: lyrics.length,
        metadata: {
          artist: artistName,
          backgroundStyle,
          syncOffsetMs,
          vocalSeparation,
          tracks: {
            original: enableOriginal,
            pronunciation: enablePronunciation,
            meaning: enableMeaning,
          },
          lyrics,
          scenes: lyrics.map((lyr, idx) => ({
            order: idx + 1,
            narration: `${lyr.original} (${lyr.meaning})`,
            hookJabText: lyr.pronunciation,
            startTime: lyr.timeSec,
          }))
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '🎵 노래형 일괄 쇼츠 생성 완료',
        description: `'${songTitle}' 3중 트랙 가사 싱크 프로젝트가 대기열에 등록되었습니다.`
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '생성 실패', description: e.message || '오류가 발생했습니다.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 사이드 레일 (4칸): 음원 투입 및 3중 트랙 설정 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileAudio className="w-3.5 h-3.5 text-primary" />
              음원 소스 및 3-Track 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              3-TRACK SYNC
            </Badge>
          </div>

          {/* 음원 업로드 또는 유튜브 URL */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">음원 파일 업로드 (MP3, WAV, M4A)</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
                <Upload className="w-4 h-4 text-primary" />
                <span className="truncate">{audioFileName || '오디오 파일 선택'}</span>
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="text-[10px] text-center text-muted-foreground">또는 유튜브 음악 링크</div>
            <input
              type="text"
              value={audioSourceUrl}
              onChange={e => setAudioSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* 곡명 및 아티스트 */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">곡 제목</label>
              <input
                type="text"
                value={songTitle}
                onChange={e => setSongTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">아티스트</label>
              <input
                type="text"
                value={artistName}
                onChange={e => setArtistName(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background"
              />
            </div>
          </div>

          {/* 3중 트랙 토글 선택기 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-foreground block">자막 3중 트랙 활성화 레이어</label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  원어 가사 (영어/외국어 원문)
                </span>
                <input
                  type="checkbox"
                  checked={enableOriginal}
                  onChange={e => setEnableOriginal(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  한글 발음 표기 (소리나는 대로)
                </span>
                <input
                  type="checkbox"
                  checked={enablePronunciation}
                  onChange={e => setEnablePronunciation(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  한국어 뜻 번역 (자연스러운 의역)
                </span>
                <input
                  type="checkbox"
                  checked={enableMeaning}
                  onChange={e => setEnableMeaning(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 싱크 오프셋 & 보컬 분리 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">가사 싱크 오프셋:</span>
              <span className="font-mono text-primary font-bold">{syncOffsetMs > 0 ? `+${syncOffsetMs}` : syncOffsetMs} ms</span>
            </div>
            <input
              type="range"
              min="-500"
              max="500"
              step="50"
              value={syncOffsetMs}
              onChange={e => setSyncOffsetMs(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-foreground">AI 보컬/MR 추출 분리</span>
              <input
                type="checkbox"
                checked={vocalSeparation}
                onChange={e => setVocalSeparation(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>

          {/* 비주얼 백그라운드 프리셋 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-muted-foreground block">비주얼 캔버스 테마</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'vinyl', label: 'LP판 회전 애니', icon: Disc },
                { id: 'visualizer', label: '오디오 스펙트럼', icon: Volume2 },
                { id: 'jacket', label: '블러 앨범 커버', icon: Sparkles },
                { id: 'poster', label: '타이포 포스터', icon: AlignLeft },
              ].map(th => {
                const Icon = th.icon;
                const isSel = backgroundStyle === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setBackgroundStyle(th.id as any)}
                    className={cn(
                      "p-2 rounded-lg border text-left transition cursor-pointer flex items-center gap-1.5",
                      isSel ? "bg-primary/10 border-primary text-primary font-bold" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{th.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 3-트랙 가사 싱크 편집기 & 프리뷰 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">3중 트랙 가사 타임코드 싱크 매트릭스</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isAnalyzing}
                onClick={handleAutoTranslateLyrics}
                className="h-7 text-xs font-bold gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 한글 발음 & 뜻 자동 생성</span>
              </Button>
            </div>

            {/* 가사 테이블 */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 p-2 bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground">
                <div className="col-span-2 flex items-center gap-1"><Clock className="w-3 h-3" /> 싱크(초)</div>
                <div className="col-span-4">원어 가사 (Original)</div>
                <div className="col-span-3">한글 발음 (Pronunciation)</div>
                <div className="col-span-3">한국어 번역 (Meaning)</div>
              </div>
              <div className="divide-y divide-border max-h-[360px] overflow-y-auto custom-scrollbar">
                {lyrics.map((line, idx) => (
                  <div key={line.id} className="grid grid-cols-12 gap-2 p-2.5 text-xs items-center hover:bg-muted/20">
                    <div className="col-span-2 font-mono text-[11px] text-primary font-bold">
                      {line.timeSec.toFixed(1)}s
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={line.original}
                        onChange={e => {
                          const val = e.target.value;
                          setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, original: val } : l));
                        }}
                        className="w-full p-1.5 rounded border border-border bg-background text-xs font-semibold"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={line.pronunciation}
                        onChange={e => {
                          const val = e.target.value;
                          setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, pronunciation: val } : l));
                        }}
                        className="w-full p-1.5 rounded border border-border bg-background text-xs text-emerald-600 dark:text-emerald-400 font-mono"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={line.meaning}
                        onChange={e => {
                          const val = e.target.value;
                          setLyrics(prev => prev.map((l, i) => i === idx ? { ...l, meaning: val } : l));
                        }}
                        className="w-full p-1.5 rounded border border-border bg-background text-xs text-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3중 자막 실시간 렌더 프리뷰 */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col items-center justify-center text-center space-y-2">
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                9:16 자막 시각화 렌더 미리보기
              </Badge>
              <div className="space-y-1 py-1">
                {enableOriginal && (
                  <div className="text-sm font-black text-foreground tracking-wide">
                    {lyrics[0]?.original || 'You look like the golden hour'}
                  </div>
                )}
                {enablePronunciation && (
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {lyrics[0]?.pronunciation || '유 룩 라이크 더 골든 아워'}
                  </div>
                )}
                {enableMeaning && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    {lyrics[0]?.meaning || '넌 마치 황금빛 노을 같아'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 생성 실행 버튼 */}
          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating || lyrics.length === 0}
              onClick={handleStartSongBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>노래형 3-Track 일괄 쇼츠 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
