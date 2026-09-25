import React, { useState } from 'react';
import { Film, RotateCcw, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MAX_CONCURRENCY, formatDurationSeconds } from './videoCreativeTypes';

interface VideoCreativeHeaderProps {
  totalCount: number;
  runningCount: number;
  queuedCount: number;
  successCount: number;
  failedCount: number;
  elapsedSeconds: number;
  hasResettableState: boolean;
  onResetAll: () => void;
}

export const VideoCreativeHeader: React.FC<VideoCreativeHeaderProps> = ({
  totalCount,
  runningCount,
  queuedCount,
  successCount,
  failedCount,
  elapsedSeconds,
  hasResettableState,
  onResetAll,
}) => {
  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState<boolean>(false);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-2 font-black text-lg text-foreground">
              <Film className="h-5 w-5 text-primary" />
              <span>영상 창작형</span>
            </h2>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border bg-muted/30">
              데스크톱 전용
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-amber-500/30 text-amber-500 bg-amber-500/10">
              베타 전용
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            대본 기반 검색·다운로드·매칭·CapCut 초안
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 설명 보기 모달 */}
          <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs border-border hover:bg-muted/60"
              >
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>설명 보기</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border text-foreground max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground text-sm font-black">
                  <Film className="h-4 w-4 text-primary" />
                  영상 창작형 제작 흐름 안내
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="text-muted-foreground text-xs leading-relaxed space-y-2 pt-2">
                    <p>
                      <strong>1. 대본 입력 or MP3 음성 전사:</strong> 직접 대본을 작성하거나 MP3 파일을 선택하면 로컬 Faster-Whisper가 문장별 타임스탬프를 추출합니다.
                    </p>
                    <p>
                      <strong>2. AI 인물/키워드 추출 & 씬 매칭:</strong> 대본의 각 문장을 분석하여 가장 어울리는 비주얼 타깃과 스톡 영상 검색 쿼리를 자동 생성합니다.
                    </p>
                    <p>
                      <strong>3. 다채널·다국어 영상 매칭:</strong> YouTube Shorts, Instagram Reels, TikTok 및 4대 언어(한국어, 영어, 일본어, 중국어)로 후보 영상을 자동 매칭합니다.
                    </p>
                    <p>
                      <strong>4. 1-클릭 CapCut 초안 조립:</strong> 비율 유지(fit) 또는 꽉 채우기(fill)를 적용하여 11트랙 규격 `draft_content.json`을 완성하고 탐색기에서 즉시 엽니다.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          {/* 전체 초기화 버튼 & 모달 */}
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasResettableState}
                data-pixi-video-creative-reset-all="true"
                className="h-8 gap-1.5 text-xs border-border hover:bg-muted/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>전체 초기화</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border text-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  영상 창작형을 전체 초기화할까요?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground text-xs leading-5">
                  현재 입력한 작업명, 대본, MP3, 후보 URL, 검색 옵션, 작업 큐와 사용 크레딧 기록이 모두 초기화됩니다. 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border hover:bg-muted text-xs">
                  취소
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onResetAll();
                    setResetDialogOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold"
                >
                  초기화
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 세마포어 배지 */}
          <Badge
            variant="outline"
            className="rounded-full border-primary/25 bg-primary/10 px-3 py-1 font-mono text-xs font-bold text-primary"
          >
            최대 {MAX_CONCURRENCY}개 동시 진행
          </Badge>
        </div>
      </div>

      {/* 6대 메트릭 요약 그리드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-sm">
        <div data-pixi-video-creative-metric="total" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-muted-foreground">총 작업</div>
          <div className="mt-1 font-mono text-base font-black text-foreground">{totalCount}</div>
        </div>
        <div data-pixi-video-creative-metric="running" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-primary">작업 중</div>
          <div className="mt-1 font-mono text-base font-black text-primary">{runningCount}</div>
        </div>
        <div data-pixi-video-creative-metric="queued" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-muted-foreground">대기</div>
          <div className="mt-1 font-mono text-base font-black text-foreground">{queuedCount}</div>
        </div>
        <div data-pixi-video-creative-metric="success" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">성공</div>
          <div className="mt-1 font-mono text-base font-black text-emerald-600 dark:text-emerald-400">{successCount}</div>
        </div>
        <div data-pixi-video-creative-metric="failed" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-destructive">실패</div>
          <div className="mt-1 font-mono text-base font-black text-destructive">{failedCount}</div>
        </div>
        <div data-pixi-video-creative-metric="elapsed" className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <div className="text-[11px] font-bold text-muted-foreground">경과</div>
          <div className="mt-1 font-mono text-base font-black text-foreground">{formatDurationSeconds(elapsedSeconds)}</div>
        </div>
      </div>
    </div>
  );
};
