import React from 'react';
import { MeokguriScript, MeokguriScene } from './types';
import { Clock, Type, Sparkles, Plus, Trash2, RotateCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MeokguriCaptionTimingEditorProps {
  script: MeokguriScript;
  onUpdateScript: (script: MeokguriScript) => void;
  isAnalyzingBg?: boolean;
}

export const MeokguriCaptionTimingEditor: React.FC<MeokguriCaptionTimingEditorProps> = ({
  script,
  onUpdateScript,
  isAnalyzingBg = false
}) => {
  const handleUpdateOpening = (val: string) => {
    onUpdateScript({ ...script, hookOpening: val });
  };

  const handleUpdateJab = (val: string) => {
    onUpdateScript({ ...script, hookJabText: val });
  };

  const handleUpdateScene = (index: number, updates: Partial<MeokguriScene>) => {
    const newScenes = script.scenes.map((sc, i) => i === index ? { ...sc, ...updates } : sc);
    onUpdateScript({ ...script, scenes: newScenes });
  };

  const handleAddScene = () => {
    const newOrder = script.scenes.length + 1;
    const newScene: MeokguriScene = {
      order: newOrder,
      narration: '새로운 씬 나레이션을 입력하세요.',
      hookJabText: '*강조*',
      durationSec: 4
    };
    onUpdateScript({ ...script, scenes: [...script.scenes, newScene] });
  };

  const handleRemoveScene = (index: number) => {
    if (script.scenes.length <= 1) return;
    onUpdateScript({ ...script, scenes: script.scenes.filter((_, i) => i !== index) });
  };

  // 픽셀링 원천: 훅 후보군 순환 (cycleJobHookDraft)
  const handleCycleHookDraft = () => {
    const drafts = script.hookDrafts || [script.hookOpening];
    if (drafts.length <= 1) return;

    const currentIndex = script.selectedHookIndex ?? 0;
    const nextIndex = (currentIndex + 1) % drafts.length;
    const nextHook = drafts[nextIndex];

    onUpdateScript({
      ...script,
      hookOpening: nextHook,
      selectedHookIndex: nextIndex
    });
  };

  const hookDrafts = script.hookDrafts || [script.hookOpening];
  const selectedHookIdx = (script.selectedHookIndex ?? 0) + 1;

  return (
    <div
      data-pixi-meokguri-caption-timing-editor
      className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-4"
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground">먹구리 자막 & 타이밍 실시간 에디터</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzingBg ? (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 animate-pulse flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>AI 실시간 분석 중...</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>TIMING SYNCED</span>
            </Badge>
          )}
        </div>
      </div>

      {/* 훅 나레이션 및 쨉쨉이 텍스트 */}
      <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              도입 훅 나레이션 (0~3초 시선 강탈)
            </label>
            {hookDrafts.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCycleHookDraft}
                className="h-6 text-[10px] gap-1 text-primary hover:bg-primary/10 cursor-pointer font-bold px-2"
                title="AI가 추천한 다른 훅 문장으로 즉시 교체"
              >
                <RotateCw className="w-2.5 h-2.5" />
                <span>다른 훅 추천 ({selectedHookIdx}/{hookDrafts.length})</span>
              </Button>
            )}
          </div>
          <input
            type="text"
            value={script.hookOpening || ''}
            onChange={e => handleUpdateOpening(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-border bg-background focus:ring-1 focus:ring-primary font-medium"
            placeholder="시작 3초를 사로잡는 질문 또는 반전 문장"
          />
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-amber-500" />
            훅 쨉쨉이 자막 (시각적 볼드 배지)
          </label>
          <input
            type="text"
            value={script.hookJabText || ''}
            onChange={e => handleUpdateJab(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-border bg-background text-amber-600 dark:text-amber-400 font-bold focus:ring-1 focus:ring-primary"
            placeholder="예: *극강의 바삭함*, *이게 진짜 된다고?*"
          />
        </div>
      </div>

      {/* 씬별 나레이션 타임라인 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            장면별 나레이션 타임코드 ({script.scenes.length}개 씬)
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddScene}
            className="h-7 text-[11px] gap-1 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            씬 추가
          </Button>
        </div>

        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {script.scenes.map((sc, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-border/70 bg-background hover:border-border transition"
            >
              <span className="w-6 text-center font-mono font-bold text-xs text-muted-foreground">
                #{sc.order}
              </span>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={sc.narration}
                  onChange={e => handleUpdateScene(idx, { narration: e.target.value })}
                  className="w-full text-xs bg-transparent border-0 focus:outline-none text-foreground"
                />
              </div>
              <div className="w-32 shrink-0">
                <input
                  type="text"
                  value={sc.hookJabText}
                  onChange={e => handleUpdateScene(idx, { hookJabText: e.target.value })}
                  placeholder="쨉쨉이 자막"
                  className="w-full text-[11px] px-2 py-1 rounded bg-muted/30 border border-border/50 text-amber-600 dark:text-amber-400 font-semibold"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                <input
                  type="number"
                  min="2"
                  max="15"
                  value={sc.durationSec}
                  onChange={e => handleUpdateScene(idx, { durationSec: Number(e.target.value) })}
                  className="w-12 text-center text-xs p-1 rounded bg-muted/40 border border-border font-mono"
                />
                <span className="text-[10px]">초</span>
              </div>
              {script.scenes.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveScene(idx)}
                  className="p-1 text-muted-foreground hover:text-destructive transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
