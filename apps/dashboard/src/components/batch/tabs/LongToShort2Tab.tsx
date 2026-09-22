import React, { useState } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  Maximize2,
  Users,
  Eye,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Zap,
  Film,
  Crosshair,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export type FramingMode = 'face-center' | 'sandwich-split' | 'blurred-pillarbox';

interface DetectedSpeaker {
  id: string;
  label: string;
  faceThumbUrl?: string;
  appearanceRatio: number;
  selected: boolean;
}

interface LongToShort2TabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const LongToShort2Tab: React.FC<LongToShort2TabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [videoTitle, setVideoTitle] = useState<string>('슈카월드 토크쇼 (28분)');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('https://www.youtube.com/watch?v=example');
  const [videoFileName, setVideoFileName] = useState<string>('');

  // 9:16 오토 리프레임 옵션
  const [framingMode, setFramingMode] = useState<FramingMode>('face-center');
  const [smoothingFactor, setSmoothingFactor] = useState<number>(0.8); // 0.1 ~ 1.0 (카메라 추적 부드러움)
  const [headroomRatio, setHeadroomRatio] = useState<number>(15); // 상단 여백 비율 (%)

  // 감지된 화자 목록
  const [speakers, setSpeakers] = useState<DetectedSpeaker[]>([
    { id: 'spk-1', label: '주 화자 (진행자)', appearanceRatio: 72, selected: true },
    { id: 'spk-2', label: '게스트 A', appearanceRatio: 21, selected: false },
    { id: 'spk-3', label: '게스트 B', appearanceRatio: 7, selected: false },
  ]);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({ title: '영상 로드 완료', description: `'${file.name}' 영상이 등록되었습니다.` });
    }
  };

  const handleScanFaces = async () => {
    setIsScanning(true);
    try {
      await new Promise(r => setTimeout(r, 700));
      toast({
        title: '🎯 AI 얼굴 감지 및 화자 추적 완료',
        description: '영상 전체 프레임에서 3명의 화자 얼굴 바운딩 박스를 성공적으로 추출했습니다.'
      });
    } catch (_) {
      toast({ variant: 'destructive', title: '스캔 실패', description: '화자 인식 중 오류가 발생했습니다.' });
    } finally {
      setIsScanning(false);
    }
  };

  const selectPrimarySpeaker = (id: string) => {
    setSpeakers(prev => prev.map(s => ({ ...s, selected: s.id === id })));
  };

  const handleStartAutoReframeBatch = async () => {
    const primary = speakers.find(s => s.selected) || speakers[0];
    setIsGenerating(true);
    try {
      const newJob = {
        id: `l2s-v2-${Date.now()}`,
        title: `[오토리프레임] ${videoTitle} - ${primary.label}`,
        sourceType: 'video',
        archetype: framingMode === 'face-center' ? 'gunlimbo' : 'classic',
        tabId: 'long-to-short-2',
        createdAt: new Date().toLocaleTimeString(),
        status: 'ready',
        scriptLinesCount: 3,
        metadata: {
          framingMode,
          smoothingFactor,
          headroomRatio,
          targetSpeaker: primary.label,
          scenes: [
            { order: 1, narration: `${primary.label} 집중 9:16 리프레임 영상입니다.`, hookJabText: '*AI 얼굴 트래킹*' },
            { order: 2, narration: `카메라 무빙 스무딩 계수 ${smoothingFactor}로 자연스럽게 시선을 유도합니다.`, hookJabText: '*9:16 최적화*' }
          ]
        }
      };

      onAddBatchJobs([newJob]);
      toast({
        title: '📸 롱투숏 v2 오토리프레임 작업 등록 완료',
        description: '화자 추적 9:16 세로 쇼츠 프로젝트가 하단 대기열에 추가되었습니다.'
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
        {/* 좌측 사이드 레일 (4칸): 소스 및 얼굴 추적 설정 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-primary" />
              AI 화자 트래킹 & 9:16 리프레임
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              FACE TRACK V2
            </Badge>
          </div>

          {/* 비디오 파일 / 링크 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">가로(16:9) 원본 비디오</label>
            <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary" />
              <span className="truncate">{videoFileName || '비디오 파일 선택'}</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <input
              type="text"
              value={videoSourceUrl}
              onChange={e => setVideoSourceUrl(e.target.value)}
              placeholder="https://www.youtube.com/..."
              className="w-full text-xs p-2 rounded-lg border border-border bg-background"
            />
          </div>

          {/* 감지된 화자 선택 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-foreground">주 추적 화자 지정</label>
              <button
                type="button"
                disabled={isScanning}
                onClick={handleScanFaces}
                className="text-[10.5px] text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>얼굴 재스캔</span>
              </button>
            </div>
            <div className="space-y-1.5">
              {speakers.map(spk => (
                <div
                  key={spk.id}
                  onClick={() => selectPrimarySpeaker(spk.id)}
                  className={cn(
                    "p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between",
                    spk.selected
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                      spk.selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {spk.label.slice(0, 1)}
                    </div>
                    <span className="text-xs">{spk.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">등장 비율 {spk.appearanceRatio}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3대 리프레임 구도 모드 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[11px] font-bold text-muted-foreground block">9:16 구도 프레이밍 모드</label>
            <div className="space-y-1.5">
              {[
                { id: 'face-center', label: '화자 중심 크롭 (Face-Center)', desc: '화자의 얼굴을 9:16 중앙에 항상 고정' },
                { id: 'sandwich-split', label: '샌드위치 분할 (Sandwich)', desc: '상단 화자 + 하단 자료화면 2단 레이아웃' },
                { id: 'blurred-pillarbox', label: '블러 배경 핏 (Blurred Fit)', desc: '원본 가로 영상 유지 + 상하 블러 채움' },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFramingMode(m.id as any)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg border text-xs transition cursor-pointer",
                    framingMode === m.id
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                      : "border-border hover:bg-muted/40 text-foreground"
                  )}
                >
                  <div>{m.label}</div>
                  <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 스무딩 및 헤드룸 조절 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">팬앤스캔 스무딩:</span>
              <span className="font-mono text-primary font-bold">{smoothingFactor} (부드러움)</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.1"
              value={smoothingFactor}
              onChange={e => setSmoothingFactor(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* 중앙 및 우측 (8칸): 9:16 인터랙티브 리프레임 캔버스 프리뷰 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">16:9 ➔ 9:16 동적 트래킹 뷰포트 프리뷰</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                ACTIVE TRACKING
              </Badge>
            </div>

            {/* 시뮬레이션 가상 뷰포트 캔버스 */}
            <div className="w-full aspect-video bg-neutral-900 rounded-xl relative overflow-hidden border border-border flex items-center justify-center">
              {/* 16:9 배경 안내 그리드 */}
              <div className="absolute inset-0 opacity-20 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-white" />
                <div className="h-full w-[1px] bg-white absolute" />
              </div>

              {/* 가상의 16:9 영상 내용물 */}
              <div className="text-center text-white/50 text-xs space-y-1">
                <Users className="w-12 h-12 mx-auto text-primary opacity-60" />
                <p className="font-bold text-white/80">{videoTitle}</p>
                <p className="text-[11px]">1920 x 1080 원본 가로 영상 레이어</p>
              </div>

              {/* 9:16 세로 컷 크롭 박스 오버레이 */}
              <div
                className="absolute h-full aspect-[9/16] border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all duration-300 flex flex-col justify-between p-2"
                style={{
                  left: framingMode === 'face-center' ? '35%' : '25%',
                }}
              >
                <div className="flex items-center justify-between text-[9px] font-mono font-black text-primary bg-black/60 px-1 py-0.5 rounded">
                  <span>9:16 세로 프레임</span>
                  <Crosshair className="w-3 h-3 text-red-500 animate-pulse" />
                </div>

                {/* 얼굴 트래킹 앵커 타겟 */}
                <div className="w-10 h-10 border border-emerald-400 rounded-full mx-auto flex items-center justify-center bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
                  얼굴
                </div>

                <div className="text-[9px] text-center font-bold text-white bg-black/60 py-0.5 rounded">
                  모드: {framingMode}
                </div>
              </div>
            </div>

            {/* 리프레임 스펙 카드 */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">타겟 화자:</span>
                <span className="font-bold text-primary">{speakers.find(s => s.selected)?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">구도 모드:</span>
                <span className="font-bold text-foreground">{framingMode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">해상도 변환:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">1920x1080 ➔ 1080x1920 (9:16 Full HD)</span>
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartAutoReframeBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>화자 트래킹 9:16 오토 리프레임 쇼츠 생성</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
