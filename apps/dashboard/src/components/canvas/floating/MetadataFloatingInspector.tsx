import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES, getRandomSatiricalMetadata } from '../constants/canvasConstants';
import { Info, Bold, User, Clock, Eye, Sparkles, Dices } from 'lucide-react';

export interface MetadataConfig {
  showAuthor: boolean;
  authorText: string;
  showTime: boolean;
  timeText: string;
  showViews: boolean;
  viewsText: string;
  separator: 'dot' | 'bar' | 'slash';
  color: string;
  font: string;
  fontSizeMultiplier: number;
  bold: boolean;
  offsetX: number;
  offsetY: number;
}

export interface MetadataFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: MetadataConfig;
  onChange: (patch: Partial<MetadataConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const MetadataFloatingInspector: React.FC<MetadataFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="메타데이터"
      icon={<Info className="w-4 h-4 text-emerald-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 🎭 풍자/위트 메타데이터 랜덤 생성기 */}
      <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-[4px] space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>풍자 밈 메타데이터 생성기</span>
          </span>
          <button
            type="button"
            onClick={() => {
              const rand = getRandomSatiricalMetadata();
              onChange({
                authorText: rand.author,
                timeText: rand.timeText,
                viewsText: rand.viewsText,
                showAuthor: true,
                showTime: true,
                showViews: true,
              });
            }}
            className="h-6 px-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-2xs"
            title="클릭 시 재미있는 직장인/커뮤니티 풍자 메타데이터 자동 주입"
          >
            <Dices className="w-3 h-3" />
            <span>랜덤 뽑기</span>
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight">
          직장인, 퇴사러, 주식개미 등 12대 한국 커뮤니티 인기 풍자 프리셋을 원클릭으로 주입합니다.
        </p>
      </div>

      {/* 1. 작성자 항목 */}
      <div className="space-y-1.5 p-2 bg-muted/20 rounded-[4px] border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span>작성자 표시</span>
          </span>
          <Switch
            checked={config.showAuthor}
            onCheckedChange={(c) => onChange({ showAuthor: c })}
          />
        </div>
        {config.showAuthor && (
          <input
            type="text"
            value={config.authorText}
            onChange={(e) => onChange({ authorText: e.target.value })}
            placeholder="작성자명 (예: 익명, 운영자, 닉네임)"
            className="w-full px-2 py-1 text-xs bg-muted/40 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        )}
      </div>

      {/* 2. 작성 시간 항목 */}
      <div className="space-y-1.5 p-2 bg-muted/20 rounded-[4px] border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>작성 시간 표시</span>
          </span>
          <Switch
            checked={config.showTime}
            onCheckedChange={(c) => onChange({ showTime: c })}
          />
        </div>
        {config.showTime && (
          <input
            type="text"
            value={config.timeText}
            onChange={(e) => onChange({ timeText: e.target.value })}
            placeholder="시간 (예: 방금 전, 10분 전, 2024.03.15)"
            className="w-full px-2 py-1 text-xs bg-muted/40 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        )}
      </div>

      {/* 3. 조회수 / 추천수 항목 */}
      <div className="space-y-1.5 p-2 bg-muted/20 rounded-[4px] border border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <span>조회수 / 추천수 표시</span>
          </span>
          <Switch
            checked={config.showViews}
            onCheckedChange={(c) => onChange({ showViews: c })}
          />
        </div>
        {config.showViews && (
          <input
            type="text"
            value={config.viewsText}
            onChange={(e) => onChange({ viewsText: e.target.value })}
            placeholder="조회수 (예: 조회 1.5만 · 추천 420)"
            className="w-full px-2 py-1 text-xs bg-muted/40 border border-border rounded-[3px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        )}
      </div>

      {/* 4. 구분 기호 선택 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">구분 기호</label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'dot', label: '점 (·)' },
            { id: 'bar', label: '바 (|)' },
            { id: 'slash', label: '슬래시 (/)' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ separator: s.id as any })}
              className={`py-1 text-xs rounded border transition ${
                config.separator === s.id
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. 글꼴 선택 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">글꼴 (Font)</label>
        <select
          value={config.font || 'Pretendard'}
          onChange={(e) => onChange({ font: e.target.value })}
          className="w-full px-2 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* 6. 글자 색상 */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.color}
        onChange={(c) => onChange({ color: c })}
      />

      {/* 7. 글자 크기 배율 & 볼드 */}
      <div className="space-y-2">
        <UnitSliderControl
          label="글자 크기"
          value={config.fontSizeMultiplier}
          min={0.5}
          max={1.8}
          step={0.05}
          unit="x"
          onChange={(v) => onChange({ fontSizeMultiplier: v })}
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground">굵게 표시</span>
          <button
            type="button"
            onClick={() => onChange({ bold: !config.bold })}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition ${
              config.bold ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bold className="w-3 h-3" />
            <span>볼드 (Bold)</span>
          </button>
        </div>
      </div>

      {/* 8. 위치 미세 조정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
        <div className="grid grid-cols-2 gap-2">
          <UnitSliderControl
            label="X 오프셋"
            value={config.offsetX}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetX: v })}
          />
          <UnitSliderControl
            label="Y 오프셋"
            value={config.offsetY}
            min={-100}
            max={100}
            step={1}
            unit="px"
            onChange={(v) => onChange({ offsetY: v })}
          />
        </div>
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default MetadataFloatingInspector;
