import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FolderOpen,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { BatchQueueItem, EpisodeData } from './types';
import { GLOBAL_LANGUAGES } from '@/types/ddalkkak';

interface BatchQueueMatrixProps {
  queueItems: BatchQueueItem[];
  onAddVideos: (files: FileList | File[]) => void;
  onOpenGalleryPicker: () => void;
  onRemoveQueueItem: (id: string) => void;
  onClearQueue: () => void;
  onStartBatchProcessing: () => void;
  isProcessing: boolean;
  onLoadIntoStudio: (item: BatchQueueItem) => void;
  isDrawerMode?: boolean;
  onCloseDrawer?: () => void;
}

export const BatchQueueMatrix: React.FC<BatchQueueMatrixProps> = ({
  queueItems,
  onAddVideos,
  onOpenGalleryPicker,
  onRemoveQueueItem,
  onClearQueue,
  onStartBatchProcessing,
  isProcessing,
  onLoadIntoStudio,
  isDrawerMode = false,
  onCloseDrawer,
}) => {
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddVideos(e.dataTransfer.files);
    }
  };

  const doneCount = queueItems.filter((q) => q.status === 'done').length;
  const processingCount = queueItems.filter((q) => q.status !== 'done' && q.status !== 'pending' && q.status !== 'error').length;

  return (
    <div className={`w-full h-full flex flex-col bg-background text-foreground select-none ${isDrawerMode ? 'p-3' : 'p-4 sm:p-6'}`}>
      {/* 1. 헤더 액션 바 */}
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-foreground flex items-center gap-2">
              다수 영상 대기열 일괄 작업 매트릭스
              {isDrawerMode && onCloseDrawer && (
                <Button variant="ghost" size="icon" onClick={onCloseDrawer} className="h-6 w-6 ml-auto">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              여러 편의 영화/드라마 영상을 일괄 등록하여 AI 씬 분할부터 CapCut 완제품까지 전자동 순차 처리
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenGalleryPicker}
            className="h-8 text-xs font-bold rounded-xl flex items-center gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>수집 보관함에서 담기</span>
          </Button>

          {queueItems.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onClearQueue}
              disabled={isProcessing}
              className="h-8 text-xs rounded-xl"
            >
              대기열 비우기
            </Button>
          )}

          <Button
            size="sm"
            onClick={onStartBatchProcessing}
            disabled={isProcessing || queueItems.length === 0}
            className="h-8 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-md"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>순차 일괄 작업 중 ({processingCount})</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>🚀 대기열 일괄 시작 ({queueItems.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 2. 대기열 상태 뱃지 바 */}
      <div className="flex items-center gap-2 py-2.5 text-xs shrink-0">
        <Badge variant="outline" className="text-xs h-6 font-semibold">
          전체: {queueItems.length}개
        </Badge>
        <Badge variant="secondary" className="text-xs h-6 font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
          완료: {doneCount}개
        </Badge>
        {processingCount > 0 && (
          <Badge variant="secondary" className="text-xs h-6 font-semibold bg-primary/15 text-primary animate-pulse">
            진행 중: {processingCount}개
          </Badge>
        )}
      </div>

      {/* 3. 드래그 앤 드롭 존 및 대기열 리스트 */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {/* 파일 드롭존 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-3 text-center transition-all cursor-pointer shrink-0 ${
            dragOver
              ? 'border-primary bg-primary/10 scale-[1.005]'
              : 'border-border hover:border-primary/50 bg-muted/20'
          }`}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'video/*';
            input.onchange = (e: any) => {
              if (e.target.files) onAddVideos(e.target.files);
            };
            input.click();
          }}
        >
          <FolderOpen className="w-6 h-6 text-muted-foreground/60 mb-1" />
          <p className="text-xs font-bold text-foreground">
            영상 파일들을 이곳에 드래그하거나 클릭하여 추가하세요
          </p>
          <p className="text-[10px] text-muted-foreground">
            MP4, MKV, MOV 등 다수 파일 동시 등록 가능
          </p>
        </div>

        {/* 대기열 리스트 스크롤 영역 */}
        <div className="flex-1 min-h-0 border border-border rounded-2xl bg-card overflow-hidden">
          {queueItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2 text-muted-foreground py-16">
              <Zap className="w-8 h-8 opacity-30 text-amber-500" />
              <p className="text-xs font-semibold">대기열에 등록된 영상이 없습니다.</p>
              <p className="text-[11px] text-muted-foreground/80">
                수집 보관함에서 영상을 담거나 위 드롭존에 파일을 넣어주세요.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full p-3">
              <div className="space-y-2.5 pb-6">
                {queueItems.map((item, idx) => {
                  const langItem = GLOBAL_LANGUAGES.find((l) => l.code === item.target_lang);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-background hover:bg-muted/20 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      {/* 좌측: 번호, 제목, 설정 뱃지 */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-muted text-foreground text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-extrabold text-foreground truncate" title={item.video_title}>
                            {item.video_title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <Badge variant="outline" className="text-[9.5px] px-1 py-0 h-4">
                              {item.target_duration_type === 'shorts' ? `쇼츠 ${item.episode_count}편` : '롱폼 하이라이트'}
                            </Badge>
                            {langItem && (
                              <Badge variant="secondary" className="text-[9.5px] px-1 py-0 h-4">
                                {langItem.flag} {langItem.name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[9.5px] px-1 py-0 h-4 uppercase">
                              {item.preset_id}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* 중앙: 진행 상태 & 프로그레스 */}
                      <div className="flex items-center gap-2 w-full sm:w-48 shrink-0">
                        {item.status === 'done' ? (
                          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            완료됨
                          </span>
                        ) : item.status === 'error' ? (
                          <span className="text-xs font-bold text-rose-500 flex items-center gap-1" title={item.error_message}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            오류 발생
                          </span>
                        ) : item.status === 'pending' ? (
                          <span className="text-xs text-muted-foreground">대기 중...</span>
                        ) : (
                          <div className="flex flex-col w-full gap-1">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-primary">
                              <span>{item.status === 'analyzing' ? 'AI 씬 분석 중' : item.status === 'voicing' ? 'TTS 합성 중' : '패키징 중'}</span>
                              <span>{item.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 우측: 액션 버튼들 */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {item.status === 'done' && (
                          <Button
                            size="sm"
                            onClick={() => onLoadIntoStudio(item)}
                            className="h-7 text-xs font-bold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1"
                            title="이 영상을 마스터 스튜디오로 불러와 9:16 모니터에서 정밀 퇴고"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>스튜디오에서 열기</span>
                          </Button>
                        )}

                        {!isProcessing && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveQueueItem(item.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};
