import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Copy,
  Wand2,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  cleanScriptLines,
  calculatePacingMetrics,
  calculateDensityMetrics,
  SAMPLE_CREATIVE_SCRIPTS,
  SampleScript
} from './textCreativeUtils';

interface TextCreativeScriptStepProps {
  title: string;
  onTitleChange: (val: string) => void;
  script: string;
  onScriptChange: (val: string) => void;
  cutPacing: 'normal' | 'loose';
  sourceMode: 'short-to-short' | 'long-to-short';
}

export const TextCreativeScriptStep: React.FC<TextCreativeScriptStepProps> = ({
  title,
  onTitleChange,
  script,
  onScriptChange,
  cutPacing,
  sourceMode
}) => {
  const [editorMode, setEditorMode] = useState<'free' | 'sections'>('free');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number | null>(null);

  const lines = cleanScriptLines(script);
  const rawLines = script.split('\n');
  const pacingMetrics = calculatePacingMetrics(lines.length, cutPacing, sourceMode);
  const densityMetrics = calculateDensityMetrics(lines, pacingMetrics.fittedMs);

  const naturalSec = Math.round(pacingMetrics.naturalMs / 1000);
  const fittedSec = Math.round(pacingMetrics.fittedMs / 1000);
  const densityPct = Math.round(densityMetrics.ratio * 100);

  // 샘플 대본 적용
  const applySampleScript = (sample: SampleScript) => {
    onTitleChange(sample.title);
    onScriptChange(sample.script);
  };

  return (
    <section id="tc-step-script" className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
      {/* 상단 스텝 라벨 및 모드 스위처 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded border border-border bg-muted/40 font-mono font-bold text-xs text-foreground">
            01
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              대본 (SCRIPT)
            </h3>
            <p className="text-[10px] text-muted-foreground">
              작업 하나에 대본 하나 — 제목을 비우면 첫 줄로 자동 생성됩니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-border/80 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setEditorMode('free')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer',
                editorMode === 'free'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              자유 입력
            </button>
            <button
              type="button"
              onClick={() => setEditorMode('sections')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer',
                editorMode === 'sections'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              섹션 편집
            </button>
          </div>
        </div>
      </div>

      {/* 대본 제목 인풋 */}
      <div>
        <Input
          type="text"
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="작업 제목 (선택) — 비워두면 대본 첫 줄로 자동 생성됩니다"
          className="h-10 text-xs font-bold bg-background border-border"
        />
      </div>

      {/* 자유 입력 모드 에디터 */}
      {editorMode === 'free' ? (
        <div className="overflow-hidden rounded-lg border border-border bg-background shadow-inner">
          <div className="flex max-h-[22rem] overflow-y-auto">
            {/* 좌측 행 번호 (모노스페이스 고정) */}
            <div
              aria-hidden="true"
              className="w-10 shrink-0 select-none border-r border-border/60 bg-muted/20 pt-3.5 pr-2 text-right font-mono text-[10.5px] text-muted-foreground/60 leading-7 tabular-nums"
            >
              {rawLines.map((_, idx) => (
                <div key={idx}>{String(idx + 1).padStart(2, '0')}</div>
              ))}
            </div>

            {/* 메인 대본 텍스트에어리어 */}
            <textarea
              value={script}
              onChange={e => onScriptChange(e.target.value)}
              placeholder="대본을 입력하세요. 줄바꿈이 자막 한 컷이 됩니다. 빈 줄은 섹션 경계가 됩니다."
              rows={Math.max(8, rawLines.length + 1)}
              className="w-full min-h-[18rem] resize-none border-0 bg-transparent p-3.5 font-normal text-xs leading-7 focus:outline-hidden focus:ring-0 text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      ) : (
        /* 섹션 편집 모드 */
        <div className="space-y-2 max-h-[22rem] overflow-y-auto p-1">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-border border-dashed p-6 text-center text-xs text-muted-foreground">
              대본이 비어 있습니다. [자유 입력] 탭에서 대본을 작성하거나 아래 샘플 대본을 불러오세요.
            </div>
          ) : (
            lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border">
                <span className="font-mono text-[11px] font-bold text-primary w-6 text-center">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={line}
                  onChange={e => {
                    const updated = [...lines];
                    updated[idx] = e.target.value;
                    onScriptChange(updated.join('\n'));
                  }}
                  className="flex-1 text-xs p-1.5 rounded border border-border bg-background"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const updated = lines.filter((_, i) => i !== idx);
                    onScriptChange(updated.join('\n'));
                  }}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 대본이 비어 있을 때: 샘플 대본 안내 바 */}
      {script.trim().length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            <b className="font-bold text-foreground">대본 입력 → 영상 소스 링크/파일 → 작업 추가</b> — 나머지는 주권 엔진이 처리합니다.
          </p>
          <div className="flex items-center gap-1.5">
            {SAMPLE_CREATIVE_SCRIPTS.map((sample, sIdx) => (
              <Button
                key={sIdx}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applySampleScript(sample)}
                className="h-7 text-[11px] font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="w-3 h-3" />
                <span>{sample.title}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 하단 실시간 타임라인 메트릭 바 (30~45초 규격 검사 & 리듬 빽빽도) */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono font-semibold tabular-nums text-foreground">
          줄 {lines.length}
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono font-semibold tabular-nums text-foreground">
          {script.length.toLocaleString()}자
        </span>

        {lines.length > 0 && (
          <>
            <span className="text-border">|</span>
            {pacingMetrics.status === 'tooLong' ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold gap-1">
                <AlertTriangle className="w-3 h-3" />
                ≈{naturalSec}초 — 45초 초과 ({pacingMetrics.lineCount - pacingMetrics.maxLines}줄 줄여주세요)
              </Badge>
            ) : pacingMetrics.status === 'tooShort' ? (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 font-bold gap-1">
                <AlertTriangle className="w-3 h-3" />
                ≈{fittedSec}초 — 30초 미달 (최소 {pacingMetrics.minLines}줄 필요)
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold gap-1">
                <CheckCircle2 className="w-3 h-3" />
                예상 ≈{fittedSec}초 · 30~45초 쇼츠 규격 충족 ✓
              </Badge>
            )}

            {/* 리듬 빽빽도 분석 */}
            {densityMetrics.status === 'tight' ? (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold">
                말이 빽빽해요 {densityPct}% — 줄을 줄이면 리듬이 살아나요
              </Badge>
            ) : densityMetrics.status === 'caution' ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                말이 조금 빽빽해요 {densityPct}%
              </Badge>
            ) : null}
          </>
        )}

        <span className="ml-auto text-[10px] text-muted-foreground/70 hidden sm:inline-block">
          한 줄 = 자막 한 컷 (30~45초 규격)
        </span>
      </div>
    </section>
  );
};
