import React, { useState } from 'react';
import {
  Sliders,
  Clock,
  VolumeX,
  Maximize2,
  MessageSquare,
  Sparkles,
  Info,
  Check,
  Globe,
  Scissors
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  LongToShort2Settings,
  LengthPresetV2,
  SilenceRemovalV2,
  FramingMode,
  LENGTH_PRESETS_V2,
  SILENCE_REMOVAL_PRESETS_V2,
  FRAMING_MODES_V2,
  calculateCandidateGuide
} from '@/types/longToShort2';

interface LongToShort2SettingsPanelProps {
  settings: LongToShort2Settings;
  onChangeSettings: (settings: LongToShort2Settings) => void;
  durationSec?: number;
  disabled?: boolean;
}

export const LongToShort2SettingsPanel: React.FC<LongToShort2SettingsPanelProps> = ({
  settings,
  onChangeSettings,
  durationSec,
  disabled
}) => {
  const guide = calculateCandidateGuide(durationSec);

  const update = <K extends keyof LongToShort2Settings>(key: K, value: LongToShort2Settings[K]) => {
    onChangeSettings({ ...settings, [key]: value });
  };

  const toggleLang = (lang: string) => {
    const current = settings.multiUseLangs;
    const next = current.includes(lang)
      ? current.filter(l => l !== lang)
      : [...current, lang];
    update('multiUseLangs', next.length > 0 ? next : ['ko']);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          2단계: 이야기 압축 및 리프레임 옵션
        </span>
        <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/20">
          V2 PARAMS
        </Badge>
      </div>

      {/* 1. 클립 목표 길이 프리셋 (jn) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            쇼츠 목표 길이
          </label>
          <span className="text-[10.5px] font-mono text-primary font-bold">
            {LENGTH_PRESETS_V2[settings.lengthPreset].rangeLabel}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(Object.keys(LENGTH_PRESETS_V2) as LengthPresetV2[]).map(key => {
            const item = LENGTH_PRESETS_V2[key];
            const isSelected = settings.lengthPreset === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => update('lengthPreset', key)}
                className={cn(
                  "p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs">{item.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                  {item.rangeLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 무음 구간 제거 (ji) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
          <VolumeX className="w-3 h-3 text-muted-foreground" />
          무음 구간 컷팅
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(SILENCE_REMOVAL_PRESETS_V2) as SilenceRemovalV2[]).map(key => {
            const item = SILENCE_REMOVAL_PRESETS_V2[key];
            const isSelected = settings.silenceRemoval === key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => update('silenceRemoval', key)}
                className={cn(
                  "p-2 rounded-lg border text-center text-xs transition cursor-pointer flex flex-col items-center justify-center",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                <span>{item.label}</span>
                <span className="text-[9.5px] text-muted-foreground mt-0.5 font-normal">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 생성 후보 쇼츠 개수 & 픽셀링 wc 가이드 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground">이야기 압축 쇼츠 개수</label>
          <span className="text-[10.5px] text-muted-foreground font-mono">
            {guide.badge}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 5, 8, 10].map(num => (
            <button
              key={num}
              type="button"
              disabled={disabled}
              onClick={() => update('candidateCount', num)}
              className={cn(
                "flex-1 h-8 rounded-lg border text-xs font-bold transition cursor-pointer relative",
                settings.candidateCount === num
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "border-border hover:bg-muted/40 text-foreground"
              )}
            >
              {num}개
              {guide.fromDuration && guide.recommended === num && (
                <span className="absolute -top-1.5 -right-1 text-[8px] bg-amber-500 text-white px-1 rounded-full font-black">
                  추천
                </span>
              )}
            </button>
          ))}
          <Input
            type="number"
            min={1}
            max={10}
            value={settings.candidateCount}
            disabled={disabled}
            onChange={e => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) update('candidateCount', Math.max(1, Math.min(10, val)));
            }}
            className="w-16 h-8 text-center text-xs font-bold font-mono"
          />
        </div>
        {guide.fromDuration && (
          <p className="text-[10px] text-muted-foreground font-mono pl-1">
            💡 {guide.label}
          </p>
        )}
      </div>

      {/* 4. 특정 구간 지정 분석 컨트롤러 (analysisRange) */}
      <div className="p-2.5 rounded-lg border border-border bg-muted/15 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
            <Scissors className="w-3.5 h-3.5 text-primary" />
            특정 구간만 지정 분석 (Analysis Range)
          </label>
          <input
            type="checkbox"
            checked={settings.analysisRange.enabled}
            disabled={disabled}
            onChange={e => update('analysisRange', {
              ...settings.analysisRange,
              enabled: e.target.checked
            })}
            className="rounded accent-primary cursor-pointer w-4 h-4"
          />
        </div>
        {settings.analysisRange.enabled && (
          <div className="space-y-1.5 pt-1 border-t border-border/60 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">시작 시점 (초)</span>
                <Input
                  type="number"
                  min={0}
                  max={durationSec ? Math.max(0, durationSec - 30) : 3600}
                  value={settings.analysisRange.startSec}
                  onChange={e => update('analysisRange', {
                    ...settings.analysisRange,
                    startSec: Math.max(0, parseInt(e.target.value, 10) || 0)
                  })}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-0.5">종료 시점 (초)</span>
                <Input
                  type="number"
                  min={settings.analysisRange.startSec + 30}
                  max={durationSec || 7200}
                  value={settings.analysisRange.endSec}
                  onChange={e => update('analysisRange', {
                    ...settings.analysisRange,
                    endSec: Math.max(settings.analysisRange.startSec + 30, parseInt(e.target.value, 10) || 1800)
                  })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <p className="text-[9.5px] text-muted-foreground font-mono">
              지정된 {settings.analysisRange.startSec}초 ~ {settings.analysisRange.endSec}초 범위 내에서만 서사 요약 압축이 실행됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 5. 9:16 구도 프레이밍 모드 3종 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
          <Maximize2 className="w-3 h-3 text-muted-foreground" />
          9:16 오토 리프레임 구도 모드
        </label>
        <div className="space-y-1">
          {FRAMING_MODES_V2.map(m => {
            const isSelected = settings.framingMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => update('framingMode', m.id)}
                className={cn(
                  "w-full text-left p-2 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span>{m.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-border font-normal">
                      {m.badge}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-normal">
                    {m.description}
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. 팬앤스캔 카메라 스무딩 계수 */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="font-bold text-foreground text-[11px]">카메라 트래킹 스무딩:</span>
          <span className="font-mono text-primary font-bold">{settings.smoothingFactor} (부드러운 시선 이동)</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.0"
          step="0.1"
          disabled={disabled}
          value={settings.smoothingFactor}
          onChange={e => update('smoothingFactor', parseFloat(e.target.value))}
          className="w-full accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
        />
      </div>

      {/* 7. 유튜브 베스트 댓글 카드 오버레이 */}
      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            유튜브 베스트 댓글 오버레이 합성
          </label>
          <input
            type="checkbox"
            checked={settings.commentSettings.enabled}
            disabled={disabled}
            onChange={e => update('commentSettings', {
              ...settings.commentSettings,
              enabled: e.target.checked
            })}
            className="rounded accent-primary cursor-pointer w-4 h-4"
          />
        </div>
        {settings.commentSettings.enabled && (
          <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-1 border-t border-border/60">
            <span>카드 노출 위치:</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="commentPos"
                  checked={settings.commentSettings.position === 'top'}
                  onChange={() => update('commentSettings', { ...settings.commentSettings, position: 'top' })}
                  className="accent-primary"
                />
                <span>상단</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="commentPos"
                  checked={settings.commentSettings.position === 'bottom'}
                  onChange={() => update('commentSettings', { ...settings.commentSettings, position: 'bottom' })}
                  className="accent-primary"
                />
                <span>하단</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 8. 다국어 멀티유즈 타겟팅 (한국어, 영어, 일본어, 중국어) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-primary" />
          다국어 번역 자막 동시 생성 (CapCut 다중 트랙)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ko', label: '한국어 (기본)' },
            { id: 'en', label: '영어 (English)' },
            { id: 'ja', label: '일본어 (日本語)' },
            { id: 'zh', label: '중국어 (中文)' }
          ].map(l => {
            const isSelected = settings.multiUseLangs.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                disabled={l.id === 'ko' || disabled}
                onClick={() => toggleLang(l.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-mono transition cursor-pointer flex items-center gap-1",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-primary" />}
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 9. 창작 압축 지시어 (AI Directive Prompt) */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          AI 이야기 압축 연출 지시어 (선택)
        </label>
        <Input
          type="text"
          value={settings.creativeDirectivePrompt}
          disabled={disabled}
          onChange={e => update('creativeDirectivePrompt', e.target.value)}
          placeholder="예: 가장 반전이 크고 몰입도 높은 사건 중심으로 요약"
          className="text-xs h-8"
        />
      </div>

      {/* 옵션 요약 바 (픽셀링 원천 optionSummary) */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-[11px] font-bold text-primary flex items-center justify-between">
        <span>설정 요약:</span>
        <span className="font-mono">
          {settings.candidateCount}개 • {LENGTH_PRESETS_V2[settings.lengthPreset].label} • {SILENCE_REMOVAL_PRESETS_V2[settings.silenceRemoval].label} • 다국어 {settings.multiUseLangs.length}개
        </span>
      </div>
    </div>
  );
};
