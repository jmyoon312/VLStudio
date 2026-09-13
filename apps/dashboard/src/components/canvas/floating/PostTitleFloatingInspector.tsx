import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { FONT_FAMILIES } from '../constants/canvasConstants';
import { Type, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Sparkles } from 'lucide-react';

export interface PostTitleConfig {
  text: string;
  color: string;
  font: string;
  fontSizeMultiplier: number;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  offsetX: number;
  offsetY: number;
  letterSpacing: number;
  lineHeight: number;
}

export interface PostTitleFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: PostTitleConfig;
  onChange: (patch: Partial<PostTitleConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const PostTitleFloatingInspector: React.FC<PostTitleFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="게시글 제목"
      icon={<Type className="w-4 h-4 text-sky-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 제목 내용 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <span>제목 텍스트</span>
        </label>
        <textarea
          rows={2}
          value={config.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="게시글 제목을 입력하세요..."
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      {/* 2. 글꼴 선택 */}
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

      {/* 3. 글자 색상 (8색 프리셋) */}
      <ColorPicker8Preset
        label="글자 색상"
        value={config.color}
        onChange={(c) => onChange({ color: c })}
      />

      {/* 4. 글자 크기 배율 */}
      <UnitSliderControl
        label="글자 크기"
        value={config.fontSizeMultiplier}
        min={0.5}
        max={2.5}
        step={0.05}
        unit="x"
        onChange={(v) => onChange({ fontSizeMultiplier: v })}
      />

      {/* 5. 정렬 & 볼드 / 이탤릭 토글 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">스타일 및 정렬</label>
        <div className="flex items-center justify-between gap-1 bg-muted/20 p-1 rounded-[4px] border border-border/50">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onChange({ align: 'left' })}
              className={`p-1.5 rounded transition ${
                config.align === 'left' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="왼쪽 정렬"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ align: 'center' })}
              className={`p-1.5 rounded transition ${
                config.align === 'center' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="가운데 정렬"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ align: 'right' })}
              className={`p-1.5 rounded transition ${
                config.align === 'right' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="오른쪽 정렬"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChange({ bold: !config.bold })}
              className={`px-2 py-1 text-[11px] font-bold rounded flex items-center gap-1 transition ${
                config.bold ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bold className="w-3 h-3" />
              <span>굵게</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ italic: !config.italic })}
              className={`px-2 py-1 text-[11px] italic rounded flex items-center gap-1 transition ${
                config.italic ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Italic className="w-3 h-3" />
              <span>기울임</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. 줄간격 및 자간 */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
        <UnitSliderControl
          label="줄간격"
          value={config.lineHeight}
          min={1.0}
          max={2.2}
          step={0.05}
          unit="x"
          onChange={(v) => onChange({ lineHeight: v })}
        />
        <UnitSliderControl
          label="자간"
          value={config.letterSpacing}
          min={-2}
          max={6}
          step={0.5}
          unit="px"
          onChange={(v) => onChange({ letterSpacing: v })}
        />
      </div>

      {/* 7. 외곽선(Stroke) 설정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">외곽선 (Stroke)</span>
          <Switch
            checked={config.strokeEnabled}
            onCheckedChange={(c) => onChange({ strokeEnabled: c })}
          />
        </div>
        {config.strokeEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="외곽선 색상"
              value={config.strokeColor}
              onChange={(c) => onChange({ strokeColor: c })}
            />
            <UnitSliderControl
              label="외곽선 두께"
              value={config.strokeWidth}
              min={1}
              max={8}
              step={0.5}
              unit="px"
              onChange={(v) => onChange({ strokeWidth: v })}
            />
          </div>
        )}
      </div>

      {/* 8. 그림자(Shadow) 설정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-semibold text-foreground">그림자 (Shadow)</span>
          <Switch
            checked={config.shadowEnabled}
            onCheckedChange={(c) => onChange({ shadowEnabled: c })}
          />
        </div>
        {config.shadowEnabled && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/30">
            <ColorPicker8Preset
              label="그림자 색상"
              value={config.shadowColor}
              onChange={(c) => onChange({ shadowColor: c })}
            />
            <UnitSliderControl
              label="그림자 번짐"
              value={config.shadowBlur}
              min={1}
              max={20}
              step={1}
              unit="px"
              onChange={(v) => onChange({ shadowBlur: v })}
            />
          </div>
        )}
      </div>

      {/* 9. 위치 미세 조정 */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">위치 미세 조정 (X, Y)</span>
        </div>
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

export default PostTitleFloatingInspector;
