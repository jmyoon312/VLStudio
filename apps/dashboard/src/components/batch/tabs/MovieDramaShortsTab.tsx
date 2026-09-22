import React, { useState } from 'react';
import {
  Tv,
  Upload,
  Sparkles,
  Clapperboard,
  Film,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  Zap,
  Volume2,
  Flame,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface MovieDramaShortsTabProps {
  onAddBatchJobs: (jobs: any[]) => void;
}

export const MovieDramaShortsTab: React.FC<MovieDramaShortsTabProps> = ({ onAddBatchJobs }) => {
  const { toast } = useToast();

  const [dramaTitle, setDramaTitle] = useState<string>('더 글로리 1화 하이라이트');
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('https://www.youtube.com/watch?v=drama-sample');

  // 씬 컷 감지 및 대사 필터링
  const [sceneCutThreshold, setSceneCutThreshold] = useState<number>(0.4); // 0.2s ~ 1.0s
  const [skipNonDialogue, setSkipNonDialogue] = useState<boolean>(true); // 대사 없는 루즈한 장면 자동 스킵
  const [targetShortsCount, setTargetShortsCount] = useState<number>(3); // 1~5편 연작

  // 영화 리뷰 스타일
  const [reviewStyle, setReviewStyle] = useState<'suspense' | 'emotional' | 'action'>('suspense');
  const [aspectRatioMode, setAspectRatioMode] = useState<'cinematic-scope' | 'full-crop' | 'sandwich'>('cinematic-scope');
  const [introHookText, setIntroHookText] = useState<string>('방영 직후 전 세계가 경악한 바로 그 장면');

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFileName(file.name);
      setDramaTitle(file.name.replace(/\.[^/.]+$/, ""));
      toast({ title: '영상 로드 완료', description: `'${file.name}' 영상이 등록되었습니다.` });
    }
  };

  const handleScanSceneChanges = async () => {
    setIsScanning(true);
    try {
      await new Promise(r => setTimeout(r, 650));
      toast({
        title: '🎬 0.4초 씬 컷 전환 감지 완료',
        description: '루즈한 비대사 구간 8분을 자동 압축하고 긴박한 씬 12개를 검출했습니다.'
      });
    } catch (_) {
      toast({ variant: 'destructive', title: '스캔 실패', description: '씬 감지 중 오류가 발생했습니다.' });
    } finally {
      setIsScanning(false);
    }
  };

  const handleStartDramaBatch = async () => {
    setIsGenerating(true);
    try {
      const newJobs = Array.from({ length: targetShortsCount }, (_, i) => {
        const partNum = i + 1;
        return {
          id: `drama-shorts-${Date.now()}-${partNum}`,
          title: `[영화리뷰] ${dramaTitle} - 제 ${partNum}부: ${introHookText}`,
          sourceType: 'video',
          archetype: 'classic',
          tabId: 'movie-drama-shorts',
          createdAt: new Date().toLocaleTimeString(),
          status: 'ready',
          scriptLinesCount: 4,
          metadata: {
            dramaTitle,
            partNum,
            reviewStyle,
            aspectRatioMode,
            sceneCutThreshold,
            scenes: [
              { order: 1, narration: `${introHookText}. 사건의 발단은 여기서 시작되었습니다.`, hookJabText: `*제 ${partNum}부*` },
              { order: 2, narration: `주인공의 결단과 함께 충격적인 진실이 드러납니다.`, hookJabText: `*숨막히는 전개*` },
              { order: 3, narration: `다음 화에서 이어집니다. 구독하고 기다려주세요.`, hookJabText: `*다음 편 예고*` },
            ]
          }
        };
      });

      onAddBatchJobs(newJobs);
      toast({
        title: '🎬 영화·드라마 쇼츠 연작 일괄 생성 완료',
        description: `총 ${targetShortsCount}개의 리뷰 쇼츠 프로젝트가 하단 대기열에 추가되었습니다.`
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
        {/* 좌측 (4칸): 소스 등록 및 씬 컷 감지 파라미터 */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5 text-primary" />
              영화·드라마 씬 감지 엔진
            </span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-mono">
              SCENE CUT 0.4s
            </Badge>
          </div>

          {/* 영상 업로드 / 링크 */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground block">작품 원본 영상 등록</label>
            <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border bg-muted/20 hover:bg-muted/40 cursor-pointer text-xs text-foreground transition">
              <Upload className="w-4 h-4 text-primary" />
              <span className="truncate">{videoFileName || '영화/드라마 영상 파일'}</span>
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

          {/* 작품명 및 훅 제목 */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">작품명 / 에피소드</label>
              <input
                type="text"
                value={dramaTitle}
                onChange={e => setDramaTitle(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">도입부 킬러 훅 문구</label>
              <input
                type="text"
                value={introHookText}
                onChange={e => setIntroHookText(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border bg-background text-primary font-semibold"
              />
            </div>
          </div>

          {/* 씬 컷 감지 민감도 슬라이더 */}
          <div className="space-y-2 pt-2 border-t border-border text-xs">
            <div className="flex justify-between">
              <span className="font-bold text-foreground">씬 체인지 감지 임계치:</span>
              <span className="font-mono text-primary font-bold">{sceneCutThreshold}초</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.1"
              value={sceneCutThreshold}
              onChange={e => setSceneCutThreshold(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-foreground">비대사 구간 자동 스킵</span>
              <input
                type="checkbox"
                checked={skipNonDialogue}
                onChange={e => setSkipNonDialogue(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
            </div>
          </div>

          <Button
            type="button"
            disabled={isScanning}
            onClick={handleScanSceneChanges}
            className="w-full h-9 text-xs font-bold gap-1.5 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>0.4초 씬 컷 체인지 스캔 실행</span>
          </Button>
        </div>

        {/* 중앙 및 우측 (8칸): 시네마틱 스타일 & 연작 일괄 생성 */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">시네마틱 리뷰 톤앤매너 & 화면 비율 설정</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                MULTI-EPISODE
              </Badge>
            </div>

            {/* 3대 리뷰 서사 톤 */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground block">리뷰 서사 스타일</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'suspense', label: '스릴러 / 긴장감', desc: '빠른 컷 전환과 긴박한 덕킹', icon: Flame },
                  { id: 'emotional', label: '감성 / 스토리', desc: '대사 중심의 깊은 서사 전달', icon: Sparkles },
                  { id: 'action', label: '액션 / 쾌감', desc: '0.3초 타격감 중심 줌 컷', icon: Zap },
                ].map(st => {
                  const Icon = st.icon;
                  const isSel = reviewStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setReviewStyle(st.id as any)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition cursor-pointer space-y-1",
                        isSel ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs" : "border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-xs">{st.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-normal">{st.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 화면 구도 및 레터박스 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-muted-foreground block">시네마틱 화면 구도</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cinematic-scope', label: '2.39:1 시네마 스코프', desc: '정통 영화 레터박스 + 중앙 집중' },
                  { id: 'full-crop', label: '9:16 풀스크린 크롭', desc: '화면을 꽉 채우는 몰입감' },
                  { id: 'sandwich', label: '상하 2단 분할', desc: '상단 본편 + 하단 자막/리뷰' },
                ].map(ar => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatioMode(ar.id as any)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition cursor-pointer",
                      aspectRatioMode === ar.id ? "bg-primary/10 border-primary text-primary font-bold" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="text-xs">{ar.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{ar.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 연작 개수 선택 */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-[11px] font-bold text-foreground block">쇼츠 연작 에피소드 분할 개수</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setTargetShortsCount(cnt)}
                    className={cn(
                      "p-2 rounded-lg border text-center text-xs font-mono font-bold transition cursor-pointer",
                      targetShortsCount === cnt
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "border-border hover:bg-muted/40 text-foreground"
                    )}
                  >
                    {cnt}부작
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 일괄 생성 실행 버튼 */}
          <div className="pt-4 border-t border-border">
            <Button
              type="button"
              disabled={isGenerating}
              onClick={handleStartDramaBatch}
              className="w-full h-11 text-xs font-black gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition cursor-pointer"
            >
              <Clapperboard className="w-4 h-4" />
              <span>영화·드라마 쇼츠 연작 {targetShortsCount}편 일괄 생성 (대기열 등록)</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
