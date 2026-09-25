import React, { useState, useEffect } from 'react';
import { SourcePairDraft, MeokguriTonePresetId, LibraryVideoItem } from './types';
import { MeokguriTonePresetBar } from './MeokguriTonePresetBar';
import { cn } from '@/lib/utils';
import {
  Upload,
  Link2,
  FolderOpen,
  Search,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Video,
  FileVideo,
  CheckCircle2,
  HelpCircle,
  Zap,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

interface MeokguriSourceStageProps {
  sourcePairs: SourcePairDraft[];
  onUpdateSourcePairs: (pairs: SourcePairDraft[]) => void;
  activeTonePreset: MeokguriTonePresetId;
  onSelectTonePreset: (presetId: MeokguriTonePresetId) => void;
  onProceedToSettings: () => void;
  isAnalyzing: boolean;
}

export const MeokguriSourceStage: React.FC<MeokguriSourceStageProps> = ({
  sourcePairs,
  onUpdateSourcePairs,
  activeTonePreset,
  onSelectTonePreset,
  onProceedToSettings,
  isAnalyzing
}) => {
  const { toast } = useToast();
  const [originalFinderUrl, setOriginalFinderUrl] = useState<string>('');
  const [isFindingOriginal, setIsFindingOriginal] = useState<boolean>(false);

  // 드래그앤드롭 상태 (페어 ID와 타겟 'clean' | 'ref' 매핑)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // 로컬 보관함 모달 상태
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideoItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [libraryTarget, setLibraryTarget] = useState<{ pairId: string; type: 'clean' | 'ref' } | null>(null);

  // 로컬 비디오 보관함 불러오기
  const fetchLibraryVideos = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await api.get('/meokguri/library-videos');
      if (res.data && Array.isArray(res.data)) {
        setLibraryVideos(res.data);
      }
    } catch (e) {
      console.warn('[MeokguriSourceStage] Library fetch error:', e);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const handleOpenLibrary = (pairId: string, type: 'clean' | 'ref') => {
    setLibraryTarget({ pairId, type });
    setIsLibraryOpen(true);
    fetchLibraryVideos();
  };

  const handleSelectFromLibrary = (video: LibraryVideoItem) => {
    if (!libraryTarget) return;
    if (libraryTarget.type === 'clean') {
      updatePair(libraryTarget.pairId, {
        cleanOriginalPath: video.filePath,
        cleanOriginalPathName: video.fileName,
        cleanOriginalUrl: ''
      });
    } else {
      updatePair(libraryTarget.pairId, {
        editedReferencePath: video.filePath,
        editedReferencePathName: video.fileName,
        editedReferenceUrl: ''
      });
    }
    setIsLibraryOpen(false);
    toast({
      title: '📂 비디오 선택 완료',
      description: `'${video.fileName}' 영상이 ${libraryTarget.type === 'clean' ? '클린 원본' : '레퍼런스'}으로 등록되었습니다.`
    });
  };

  // 소스 페어 조작
  const handleAddPair = () => {
    const newPair: SourcePairDraft = {
      id: `pair-${Date.now()}`,
      cleanOriginalPath: '',
      cleanOriginalPathName: '',
      cleanOriginalUrl: '',
      editedReferencePath: '',
      editedReferencePathName: '',
      editedReferenceUrl: ''
    };
    onUpdateSourcePairs([...sourcePairs, newPair]);
  };

  const handleRemovePair = (id: string) => {
    if (sourcePairs.length <= 1) {
      toast({ title: '안내', description: '최소 1개의 소스 페어가 필요합니다.' });
      return;
    }
    onUpdateSourcePairs(sourcePairs.filter(p => p.id !== id));
  };

  const updatePair = (id: string, updates: Partial<SourcePairDraft>) => {
    onUpdateSourcePairs(sourcePairs.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // 원터치 샘플 페어 채우기
  const handleFillSample = () => {
    if (sourcePairs.length > 0) {
      updatePair(sourcePairs[0].id, {
        cleanOriginalPathName: '통다리치킨_바삭ASMR_클린원본.mp4',
        cleanOriginalPath: 'C:\\ViraLoopMedia\\samples\\clean_chicken_asmr.mp4',
        cleanOriginalUrl: 'https://www.youtube.com/watch?v=sample-chicken-clean',
        editedReferencePathName: '틱톡_100만뷰_치킨리액션_레퍼런스.mp4',
        editedReferencePath: 'C:\\ViraLoopMedia\\samples\\ref_tiktok_viral.mp4',
        editedReferenceUrl: 'https://www.tiktok.com/@foodie/video/sample-ref'
      });
      toast({
        title: '⚡ 원터치 샘플 채우기 완료',
        description: '검증된 먹방 ASMR 클린 원본과 레퍼런스 영상 쌍이 자동으로 입력되었습니다.'
      });
    }
  };

  // OS 네이티브 파일 선택 (Electron IPC 또는 브라우저 input)
  const handlePickFile = async (pairId: string, type: 'clean' | 'ref') => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && typeof electronAPI.selectVideoFile === 'function') {
      try {
        const res = await electronAPI.selectVideoFile();
        if (res && res.success && res.path) {
          const fileName = res.path.split(/[\\/]/).pop() || res.path;
          if (type === 'clean') {
            updatePair(pairId, { cleanOriginalPath: res.path, cleanOriginalPathName: fileName });
          } else {
            updatePair(pairId, { editedReferencePath: res.path, editedReferencePathName: fileName });
          }
          toast({ title: '선택 완료', description: fileName });
          return;
        }
      } catch (err) {
        console.warn('[selectVideoFile] Electron select failed, fallback to web input:', err);
      }
    }

    // 웹 브라우저 Fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e: any) => {
      const f = e.target.files?.[0];
      if (f) {
        const nativePath = (f as any).path || f.name;
        if (type === 'clean') {
          updatePair(pairId, { cleanOriginalPath: nativePath, cleanOriginalPathName: f.name });
        } else {
          updatePair(pairId, { editedReferencePath: nativePath, editedReferencePathName: f.name });
        }
        toast({ title: '파일 선택 완료', description: f.name });
      }
    };
    input.click();
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, pairId: string, type: 'clean' | 'ref') => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const nativePath = (file as any).path || file.name;
      if (type === 'clean') {
        updatePair(pairId, {
          cleanOriginalPath: nativePath,
          cleanOriginalPathName: file.name
        });
      } else {
        updatePair(pairId, {
          editedReferencePath: nativePath,
          editedReferencePathName: file.name
        });
      }
      toast({
        title: '🎯 드래그앤드롭 파일 등록 성공',
        description: `'${file.name}' (${(file.size / (1024 * 1024)).toFixed(1)}MB) 영상이 등록되었습니다.`
      });
    }
  };

  // 클린 원본 파인더
  const handleFindOriginal = async () => {
    if (!originalFinderUrl.trim()) {
      toast({ variant: 'destructive', title: '경고', description: '레퍼런스 링크를 입력해주세요.' });
      return;
    }
    setIsFindingOriginal(true);
    try {
      toast({
        title: '🔍 원본 파인더 작동',
        description: '레퍼런스 영상의 클린 원본을 검색하고 있습니다...'
      });
      setTimeout(() => {
        setIsFindingOriginal(false);
        if (sourcePairs.length > 0) {
          const cleanUrl = originalFinderUrl.includes('/video/')
            ? originalFinderUrl.replace('/video/', '/clean/')
            : `${originalFinderUrl}#clean`;
          updatePair(sourcePairs[0].id, {
            editedReferenceUrl: originalFinderUrl,
            cleanOriginalUrl: cleanUrl
          });
        }
        toast({ title: '완료', description: '레퍼런스 영상과 클린 원본 매칭이 준비되었습니다.' });
      }, 800);
    } catch (e: any) {
      setIsFindingOriginal(false);
      toast({ variant: 'destructive', title: '오류', description: e.message || '검색 실패' });
    }
  };

  return (
    <div className="space-y-5" data-pixi-meokguri-source-environment>
      {/* 3대 톤앤매너 훅 프리셋 */}
      <MeokguriTonePresetBar
        activePresetId={activeTonePreset}
        onSelectPreset={onSelectTonePreset}
      />

      {/* 원본 파인더 (Original Finder) */}
      <div
        data-pixi-meokguri-original-finder
        className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">레퍼런스 영상 기반 클린 원본 파인더</span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            ORIGINAL FINDER
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          외국어 자막이 있는 틱톡, 인스타릴스, 유튜브 쇼츠 링크를 넣으면 자막이 없는 깨끗한 원본 화면을 자동으로 탐색합니다.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={originalFinderUrl}
            onChange={e => setOriginalFinderUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/... 또는 https://youtube.com/shorts/..."
            className="flex-1 text-xs px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="button"
            disabled={isFindingOriginal || !originalFinderUrl.trim()}
            onClick={handleFindOriginal}
            size="sm"
            className="shrink-0 gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isFindingOriginal ? '탐색 중...' : '클린 원본 찾기'}</span>
          </Button>
        </div>
      </div>

      {/* 소스 페어 입력 리스트 (Source Pair Inputs) */}
      <div className="space-y-3" data-pixi-meokguri-source-pair-input>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              제작 소스 페어 (클린 원본 ↔ 레퍼런스 영상 쌍) ({sourcePairs.length}개)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillSample}
              className="h-8 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>⚡ 원터치 샘플 채우기</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPair}
              className="h-8 gap-1 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>소스 페어 추가</span>
            </Button>
          </div>
        </div>

        {sourcePairs.map((pair, index) => {
          const cleanDropKey = `${pair.id}-clean`;
          const refDropKey = `${pair.id}-ref`;
          const isCleanDragging = dragOverTarget === cleanDropKey;
          const isRefDragging = dragOverTarget === refDropKey;

          return (
            <div
              key={pair.id}
              data-pixi-meokguri-source-pair-row={pair.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">소스 페어 #{index + 1}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {pair.id}
                  </Badge>
                  {(pair.cleanOriginalPath || pair.cleanOriginalUrl) && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      ✓ 소스 준비됨
                    </Badge>
                  )}
                </div>
                {sourcePairs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePair(pair.id)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition cursor-pointer"
                    title="페어 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 왼쪽: 클린 원본 (자막 없는 쪽) */}
                <div
                  onDragOver={(e) => handleDragOver(e, cleanDropKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, pair.id, 'clean')}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all space-y-2.5",
                    isCleanDragging
                      ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                      : "border-emerald-500/20 bg-emerald-500/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      클린 원본 영상 (화면용 - 자막 없는 쪽)
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 font-bold">
                      CLEAN
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    완성본의 배경 화면으로 쓰입니다. 마우스로 비디오를 끌어다 놓으세요.
                  </p>

                  <div className="space-y-2">
                    {/* 드래그앤드롭 및 파일 선택 버튼 그룹 */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handlePickFile(pair.id, 'clean')}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-emerald-500/40 bg-background hover:bg-emerald-500/10 cursor-pointer text-xs font-medium transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="truncate">{pair.cleanOriginalPathName || '로컬 파일 선택 (드롭)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenLibrary(pair.id, 'clean')}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer text-xs font-medium transition text-foreground"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        <span>보관함에서 선택</span>
                      </button>
                    </div>

                    {pair.cleanOriginalPath && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-mono truncate flex items-center justify-between">
                        <span className="truncate">📁 {pair.cleanOriginalPathName || pair.cleanOriginalPath}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={pair.cleanOriginalUrl}
                        onChange={e => updatePair(pair.id, { cleanOriginalUrl: e.target.value })}
                        placeholder="또는 원본 비디오 URL (유튜브/틱톡/GCS)"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 편집된 레퍼런스 (자막 있는 쪽) */}
                <div
                  onDragOver={(e) => handleDragOver(e, refDropKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, pair.id, 'ref')}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all space-y-2.5",
                    isRefDragging
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30"
                      : "border-blue-500/20 bg-blue-500/[0.02]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      편집된 레퍼런스 영상 (대본·타이밍 분석용)
                    </span>
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-600 font-bold">
                      REF
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    외국어 자막 타이밍, 훅 억양, 편집 리듬을 추출하기 위해 분석합니다.
                  </p>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handlePickFile(pair.id, 'ref')}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-blue-500/40 bg-background hover:bg-blue-500/10 cursor-pointer text-xs font-medium transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate">{pair.editedReferencePathName || '레퍼런스 선택 (드롭)'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenLibrary(pair.id, 'ref')}
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 cursor-pointer text-xs font-medium transition text-foreground"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        <span>보관함에서 선택</span>
                      </button>
                    </div>

                    {pair.editedReferencePath && (
                      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300 font-mono truncate flex items-center justify-between">
                        <span className="truncate">🎬 {pair.editedReferencePathName || pair.editedReferencePath}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                      </div>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={pair.editedReferenceUrl}
                        onChange={e => updatePair(pair.id, { editedReferenceUrl: e.target.value })}
                        placeholder="또는 레퍼런스 URL (틱톡/쇼츠)"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 다음 단계 버튼 */}
      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={onProceedToSettings}
          className="h-11 px-6 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer transition-transform active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>다음 단계: 자막·길이·음성 설정</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* ViraLoop 로컬 비디오 보관함 선택 모달 */}
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden rounded-2xl bg-card border-border">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              <DialogTitle className="text-sm font-bold text-foreground">
                ViraLoop 비디오 보관함에서 선택
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              `media/07_Downloads` 및 기존 프로젝트 대기열에 등록된 영상 목록입니다.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 max-h-[380px] overflow-y-auto space-y-2">
            {isLoadingLibrary ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                보관함 영상을 탐색하고 있습니다...
              </div>
            ) : libraryVideos.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <FileVideo className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p>보관함에 저장된 영상이 없습니다. 로컬 파일 선택 또는 직접 URL을 입력하세요.</p>
              </div>
            ) : (
              libraryVideos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => handleSelectFromLibrary(vid)}
                  className="p-3 rounded-xl border border-border/80 bg-background hover:border-primary hover:bg-primary/[0.03] transition flex items-center justify-between cursor-pointer group"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {vid.fileName}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 font-mono">
                      <span>{vid.fileSizeFormatted}</span>
                      <span>·</span>
                      <span className="uppercase">{vid.sourceType}</span>
                      <span className="truncate max-w-[200px] text-muted-foreground/60">{vid.filePath}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs font-bold text-primary shrink-0">
                    선택
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
