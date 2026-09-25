import React, { useState, useMemo } from 'react';
import {
  Play,
  Scissors,
  Eye,
  Film,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Download,
  FolderOpen,
  FileText,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, getMediaUrl } from '@/lib/utils';
import { GLOBAL_LANGUAGES } from '@/types/ddalkkak';

export interface BatchWorkItem {
  id: string | number;
  title: string;
  sourceOrigin?: string;
  sourceSnippet?: string;
  archetype: string;
  templateId: string;
  templateName?: string;
  targetLang: string; // e.g. 'ko', 'en', 'ja'
  langFlag?: string;
  langName?: string;
  status: 'ready' | 'processing' | 'completed' | 'failed';
  progress: number;
  statusMessage?: string;
  videoUrl?: string;
  filePath?: string;
  capcutDraftPath?: string;
  scriptContent?: string;
  srtContent?: string;
  metadata?: any;
  createdAt: string | number;
}

interface BatchWorkQueueSectionProps {
  items?: BatchWorkItem[];
  selectedItemIds?: (string | number)[];
  onToggleSelect: (id: string | number) => void;
  onToggleSelectAll: () => void;
  onPlayItem: (item: BatchWorkItem) => void;
  onViewDetail: (item: BatchWorkItem) => void;
  onEditNle: (item: BatchWorkItem) => void;
  onExportCapcut: (item: BatchWorkItem) => void;
  onDeleteItem: (id: string | number) => void;
  onBulkExportCapcut?: () => void;
  onBulkDelete?: () => void;
  onRefresh?: () => void;
}

export const BatchWorkQueueSection: React.FC<BatchWorkQueueSectionProps> = ({
  items = [],
  selectedItemIds = [],
  onToggleSelect,
  onToggleSelectAll,
  onPlayItem,
  onViewDetail,
  onEditNle,
  onExportCapcut,
  onDeleteItem,
  onBulkExportCapcut,
  onBulkDelete,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'box' | 'table'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [langFilter, setLangFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 필터링 및 정렬
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (langFilter !== 'all' && item.targetLang !== langFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchOrigin = (item.sourceOrigin || '').toLowerCase().includes(q);
        const matchLang = (item.langName || item.targetLang).toLowerCase().includes(q);
        if (!matchTitle && !matchOrigin && !matchLang) return false;
      }
      return true;
    });
  }, [items, statusFilter, langFilter, searchQuery]);

  const counts = useMemo(() => {
    const processing = items.filter(i => i.status === 'processing').length;
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'failed').length;
    return { total: items.length, processing, completed, failed };
  }, [items]);

  const isAllSelected = filteredItems.length > 0 && filteredItems.every(i => selectedItemIds.includes(i.id));

  return (
    <div className="w-full flex-1 flex flex-col bg-card border border-border rounded-2xl p-3 shadow-xs space-y-2.5 overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. 상단 마스터 대기열 제어 헤더 바
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">
              대용량 주권 생성 대기열 & 결과물 허브
            </h3>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted font-bold text-foreground">
              전체 {counts.total}
            </Badge>
            {counts.processing > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 animate-pulse font-bold">
                진행 {counts.processing}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold">
              완료 {counts.completed}
            </Badge>
            {counts.failed > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10 font-bold">
                실패 {counts.failed}
              </Badge>
            )}
          </div>
        </div>

        {/* 우측 컨트롤: 상태 필터 + 언어 필터 + 뷰모드 토글 + 일괄 액션 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 검색창 */}
          <div className="relative w-36 sm:w-44">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="작업명/언어 검색..."
              className="h-7 pl-6 text-[11px] bg-background"
            />
          </div>

          {/* 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="h-7 px-2 text-[11px] font-semibold rounded-lg border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">전체 상태</option>
            <option value="processing">진행 중</option>
            <option value="completed">완료됨</option>
            <option value="failed">오류</option>
          </select>

          {/* 언어 필터 */}
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value)}
            className="h-7 px-2 text-[11px] font-semibold rounded-lg border border-border bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">전체 언어</option>
            {GLOBAL_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.name}
              </option>
            ))}
          </select>

          {/* 뷰 모드 토글: 박스 뷰 vs 테이블 뷰 */}
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1 rounded cursor-pointer transition-colors text-muted-foreground hover:text-foreground",
                viewMode === 'table' && "bg-background text-primary shadow-xs font-bold"
              )}
              title="테이블 뷰 (대량 작업 엑셀형)"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('box')}
              className={cn(
                "p-1 rounded cursor-pointer transition-colors text-muted-foreground hover:text-foreground",
                viewMode === 'box' && "bg-background text-primary shadow-xs font-bold"
              )}
              title="박스 뷰 (카드형)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 일괄 캡컷 내보내기 버튼 */}
          {onBulkExportCapcut && counts.completed > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={onBulkExportCapcut}
              className="h-7 text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1 px-2.5 rounded-lg shadow-xs cursor-pointer"
            >
              <Film className="w-3 h-3" />
              <span>선택 캡컷 일괄</span>
            </Button>
          )}

          {/* 일괄 삭제 */}
          {onBulkDelete && (selectedItemIds?.length ?? 0) > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onBulkDelete}
              className="h-7 text-[11px] font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 px-2 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{selectedItemIds?.length ?? 0}개 삭제</span>
            </Button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="대기열 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 대기열 본체: 테이블 뷰 (Data Table) vs 박스 뷰 (Card Grid)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[220px]">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-2xl mb-1">
              🎬
            </div>
            <h4 className="text-xs font-bold text-foreground">대기열에 등록된 제작 작업이 없습니다</h4>
            <p className="text-[11px] max-w-md text-muted-foreground leading-relaxed">
              상단 소스 풀에서 기사/썰/대본 또는 영상을 선택하고 하단 발주 버튼을 누르면,
              타겟 언어별 파생 쇼츠 작업 매트릭스가 이곳에 실시간으로 생성 및 렌더링됩니다.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* ── 2A. 테이블 뷰 (엑셀형 고성능 데이터 그리드) ── */
          <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 text-muted-foreground text-[10.5px] font-bold sticky top-0 border-b border-border z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={onToggleSelectAll}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {isAllSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                  </th>
                  <th className="py-2 px-2.5 w-12 text-center">#</th>
                  <th className="py-2 px-3">제작 작업명 / 소스 정보</th>
                  <th className="py-2 px-2.5 w-28 text-center">타겟 언어</th>
                  <th className="py-2 px-2.5 w-28 text-center">폼팩터/템플릿</th>
                  <th className="py-2 px-3 w-36 text-center">진행률 및 상태</th>
                  <th className="py-2 px-3 w-40 text-center">생성 시각</th>
                  <th className="py-2 px-3 text-right">프로덕션 액션 (원클릭)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const isDone = item.status === 'completed';
                  const isProcessing = item.status === 'processing';
                  const isFailed = item.status === 'failed';

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors text-[11.5px]",
                        isSelected && "bg-primary/5 font-semibold"
                      )}
                    >
                      <td className="py-2 px-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(item.id)}
                          className="rounded text-primary border-border focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-2.5 text-center font-mono text-[10.5px] text-muted-foreground">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 min-w-0 max-w-sm">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Film className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate font-bold text-foreground" title={item.title}>
                            {item.title}
                          </span>
                        </div>
                        {item.sourceOrigin && (
                          <div className="text-[10px] text-muted-foreground truncate pl-5">
                            출처: {item.sourceOrigin}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          <span>{item.langFlag || '🌐'}</span>
                          <span className="uppercase">{item.targetLang}</span>
                        </span>
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <Badge variant="outline" className="text-[10px] font-medium border-border/80 uppercase">
                          {item.archetype}
                        </Badge>
                      </td>

                      <td className="py-2 px-3 text-center">
                        {isProcessing ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-primary font-mono">
                              <span className="flex items-center gap-1">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                <span>렌더링</span>
                              </span>
                              <span>{item.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : isDone ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.2 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                            <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" />
                            완료 (Ready)
                          </Badge>
                        ) : isFailed ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.2 font-bold text-destructive border-destructive/40 bg-destructive/10">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5 inline" />
                            오류
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.2 text-muted-foreground border-border">
                            대기 중
                          </Badge>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center font-mono text-[10px] text-muted-foreground">
                        {typeof item.createdAt === 'number'
                          ? new Date(item.createdAt).toLocaleTimeString('ko-KR')
                          : item.createdAt}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* 1. 재생 버튼 */}
                          {isDone && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => onPlayItem(item)}
                              className="h-6 text-[10.5px] px-2 font-bold border-border bg-background hover:bg-muted text-primary gap-0.5 rounded-md cursor-pointer"
                              title="영상 즉시 재생 검수"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>재생</span>
                            </Button>
                          )}

                          {/* 2. 세부 결과 모달 */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onViewDetail(item)}
                            className="h-6 text-[10.5px] px-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5 rounded-md cursor-pointer"
                            title="대본, 자막, 프롬프트 세부 검수"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            <span>세부결과</span>
                          </Button>

                          {/* 3. 세부 편집 (Pro NLE 직결) */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onEditNle(item)}
                            className="h-6 text-[10.5px] px-2 font-bold border-border bg-background hover:bg-muted text-foreground gap-0.5 rounded-md cursor-pointer"
                            title="Pro NLE 전문 편집기로 열기"
                          >
                            <Scissors className="w-2.5 h-2.5 text-primary" />
                            <span>세부편집</span>
                          </Button>

                          {/* 4. 캡컷 내보내기 */}
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onExportCapcut(item)}
                            className="h-6 text-[10.5px] px-2 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-0.5 rounded-md shadow-2xs cursor-pointer"
                            title="CapCut Draft 프로젝트 즉시 생성"
                          >
                            <Film className="w-2.5 h-2.5" />
                            <span>CapCut</span>
                          </Button>

                          {/* 삭제 */}
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                            title="작업 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── 2B. 박스 뷰 (Card Grid 형태) ── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredItems.map(item => {
              const isSelected = selectedItemIds.includes(item.id);
              const isDone = item.status === 'completed';
              const isProcessing = item.status === 'processing';
              const isFailed = item.status === 'failed';

              return (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-xl border bg-card text-left transition-all relative flex flex-col justify-between select-none group space-y-2 shadow-2xs",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                      : "border-border/80 hover:border-primary/40"
                  )}
                >
                  {/* 상단 뱃지 & 체크박스 */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded text-primary border-border focus:ring-0 cursor-pointer shrink-0"
                      />
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <span>{item.langFlag || '🌐'}</span>
                        <span className="uppercase">{item.targetLang}</span>
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-border uppercase">
                        {item.archetype}
                      </Badge>
                    </div>

                    <div className="shrink-0">
                      {isDone ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                          완료
                        </Badge>
                      ) : isProcessing ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold text-blue-600 dark:text-blue-400 border-blue-500/40 bg-blue-500/10 animate-pulse">
                          {item.progress}%
                        </Badge>
                      ) : isFailed ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-bold text-destructive border-destructive/40 bg-destructive/10">
                          오류
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground border-border">
                          대기
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 제목 및 출처 */}
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors" title={item.title}>
                      {item.title}
                    </h5>
                    <p className="text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.sourceSnippet || item.sourceOrigin || '자동 구성된 쇼츠 영상 프로젝트'}
                    </p>
                  </div>

                  {/* 진행률 바 (처리 중일 때) */}
                  {isProcessing && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* 하단 4대 액션 버튼 */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      {isDone && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onPlayItem(item)}
                          className="h-6 text-[10px] px-1.5 font-bold border-border bg-background hover:bg-muted text-primary gap-0.5 rounded-md cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>재생</span>
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onViewDetail(item)}
                        className="h-6 text-[10px] px-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-0.5 rounded-md cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>결과</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onEditNle(item)}
                        className="h-6 text-[10px] px-1.5 font-bold border-border bg-background hover:bg-muted text-foreground gap-0.5 rounded-md cursor-pointer"
                      >
                        <Scissors className="w-2.5 h-2.5 text-primary" />
                        <span>편집</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onExportCapcut(item)}
                        className="h-6 text-[10px] px-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-0.5 rounded-md shadow-2xs cursor-pointer"
                      >
                        <Film className="w-2.5 h-2.5" />
                        <span>CapCut</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                        title="작업 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default BatchWorkQueueSection;
