import React from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Clock,
  VolumeX,
  Languages,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LengthPreset,
  LENGTH_PRESETS,
  ExtractionSettings,
  VideoProbeResult
} from '@/types/longToShort';

interface LongToShortPresetOptionsProps {
  settings: ExtractionSettings;
  onChange: (newSettings: ExtractionSettings) => void;
  probeData: VideoProbeResult | null;
  onRequestOverlapConsent?: () => void;
  disabled?: boolean;
}

const MULTI_LANG_OPTIONS = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: '영어 (US)' },
  { id: 'ja', label: '일본어' },
  { id: 'es', label: '스페인어' },
  { id: 'de', label: '독일어' }
];

export const LongToShortPresetOptions: React.FC<LongToShortPresetOptionsProps> = ({
  settings,
  onChange,
  probeData,
  onRequestOverlapConsent,
  disabled
}) => {
  const maxSafeCandidates = probeData ? probeData.max_candidates : 10;
  const recommendedCandidates = probeData ? probeData.recommended_candidates : 3;
  const isOverMax = settings.candidate_count > maxSafeCandidates;

  const handlePresetSelect = (preset: LengthPreset) => {
    const pObj = LENGTH_PRESETS.find(p => p.id === preset);
    onChange({
      ...settings,
      length_preset: preset,
      target_duration_sec: pObj?.defaultSec
    });
  };

  const handleCandidateCountChange = (val: number) => {
    if (val > maxSafeCandidates && !settings.allow_overlap && onRequestOverlapConsent) {
      onRequestOverlapConsent();
    }
    onChange({
      ...settings,
      candidate_count: val
    });
  };

  const toggleMultiLang = (langId: string) => {
    const exists = settings.multi_use_langs.includes(langId);
    let updated = exists
      ? settings.multi_use_langs.filter(id => id !== langId)
      : [...settings.multi_use_langs, langId];
    if (updated.length === 0) updated = ['ko'];
    onChange({ ...settings, multi_use_langs: updated });
  };

  return (
    <div className="space-y-4">
      {/* 1. 픽셀링 4대 쇼츠 길이 프리셋 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>목표 쇼츠 길이 프리셋</span>
          </label>
          <span className="text-[10px] text-muted-foreground font-mono">
            {LENGTH_PRESETS.find(p => p.id === settings.length_preset)?.rangeSec}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {LENGTH_PRESETS.map(preset => {
            const isSelected = settings.length_preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  "p-2 rounded-xl border text-left transition cursor-pointer space-y-0.5",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary shadow-2xs"
                    : "border-border hover:bg-muted/40 text-foreground"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] px-1 py-0 font-mono font-bold",
                      isSelected
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "text-muted-foreground border-border"
                    )}
                  >
                    {preset.badge}
                  </Badge>
                </div>
                <p className="text-[9px] text-muted-foreground line-clamp-1">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 스마트 후보 개수 설정 슬라이더 */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>추출할 킬러 하이라이트 개수</span>
          </label>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] text-muted-foreground">권장: {recommendedCandidates}개</span>
            <span className="text-xs font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
              {settings.candidate_count}개
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <input
            type="range"
            min="1"
            max={Math.max(10, maxSafeCandidates + 5)}
            step="1"
            value={settings.candidate_count}
            onChange={e => handleCandidateCountChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>1개 (단일 핵심)</span>
            <span>중복 없이 최대 {maxSafeCandidates}개</span>
            <span>최대 15개</span>
          </div>
        </div>

        {/* 중복 경고 및 안내 */}
        {isOverMax && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] space-y-1">
            <div className="flex items-center gap-1 font-bold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>영상 길이 대비 후보 수가 많습니다</span>
            </div>
            <p className="leading-tight text-[9px]">
              이 영상 길이에선 중복 없이 최대 {maxSafeCandidates}개까지 가능합니다. 현재 중복 허용 모드로 {settings.candidate_count}개를 최대한 채웁니다.
            </p>
          </div>
        )}
      </div>

      {/* 3. 무음 구간 자동 압축 및 분할 */}
      <div className="space-y-2 pt-2 border-t border-border text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <VolumeX className="w-3.5 h-3.5 text-primary" />
            <span>무음 구간 자동 압축 분할</span>
          </span>
          <input
            type="checkbox"
            checked={settings.silence_removal}
            onChange={e => onChange({ ...settings, silence_removal: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </div>

        {settings.silence_removal && (
          <div className="space-y-1 pl-5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>무음 판정 임계치:</span>
              <span className="font-mono text-primary font-bold">{settings.silence_threshold_sec}초 이상</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="1.5"
              step="0.1"
              value={settings.silence_threshold_sec}
              onChange={e => onChange({ ...settings, silence_threshold_sec: Number(e.target.value) })}
              disabled={disabled}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 4. AI 포커스 지시어 (Directives) */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>AI 추출 집중 지시어 (선택)</span>
        </label>
        <input
          type="text"
          value={settings.directives}
          onChange={e => onChange({ ...settings, directives: e.target.value })}
          placeholder="예: 주인공의 충격적인 반전 고백, 투자 팁 핵심 구간 등"
          disabled={disabled}
          className="w-full text-xs p-2 rounded-lg border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <span className="text-[9px] text-muted-foreground block">
          * 특정 인물, 감정선, 핵심 키워드를 입력하면 해당 구간의 VMI 점수에 가중치가 부여됩니다.
        </span>
      </div>

      {/* 5. 다국어 멀티유즈 타겟 언어 */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>글로벌 멀티유즈 자동 번역</span>
          </label>
          <span className="text-[10px] text-muted-foreground">
            {settings.multi_use_langs.length}개 선택
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {MULTI_LANG_OPTIONS.map(opt => {
            const isChecked = settings.multi_use_langs.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleMultiLang(opt.id)}
                className={cn(
                  "px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer border",
                  isChecked
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
