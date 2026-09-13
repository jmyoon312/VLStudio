import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { VideoFitMode } from '../forms/VideoCropInspectorForm';
import { Film, Maximize2, FlipHorizontal, FlipVertical, RotateCw } from 'lucide-react';

export interface VideoCropConfig {
  fitMode: VideoFitMode;
  blurBg: boolean;
  zoomScale: number;
  focusXPct: number;
  focusYPct: number;
  rotationDeg: number;
  horizontalFlip: boolean;
  verticalFlip: boolean;
}

export interface VideoCropFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: VideoCropConfig;
  onChange: (patch: Partial<VideoCropConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const VideoCropFloatingInspector: React.FC<VideoCropFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="비디오 화면 & 구도"
      icon={<Film className="w-4 h-4 text-cyan-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 화면 맞춤 모드 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">화면 맞춤 방식</label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'fit', label: '비율 유지 (Fit)' },
            { id: 'fill', label: '화면 채움 (Fill)' },
            { id: 'stretch', label: '늘림 (Stretch)' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange({ fitMode: m.id as VideoFitMode })}
              className={`py-1.5 text-xs rounded border transition font-medium ${
                config.fitMode === m.id
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 블러 배경 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">배경 블러 채움 (Blur BG)</span>
        <Switch
          checked={config.blurBg}
          onCheckedChange={(c) => onChange({ blurBg: c })}
        />
      </div>

      {/* 3. 확대/축소 배율 */}
      <UnitSliderControl
        label="영상 줌 (Zoom Scale)"
        value={config.zoomScale}
        min={0.5}
        max={3.0}
        step={0.05}
        unit="x"
        onChange={(v) => onChange({ zoomScale: v })}
      />

      {/* 4. 포커스 중심점 (X, Y) */}
      <div className="grid grid-cols-2 gap-2">
        <UnitSliderControl
          label="가로 중심 (X)"
          value={config.focusXPct}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onChange({ focusXPct: v })}
        />
        <UnitSliderControl
          label="세로 중심 (Y)"
          value={config.focusYPct}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onChange({ focusYPct: v })}
        />
      </div>

      {/* 5. 회전 각도 */}
      <UnitSliderControl
        label="회전 각도 (Rotation)"
        value={config.rotationDeg}
        min={-180}
        max={180}
        step={1}
        unit="deg"
        onChange={(v) => onChange({ rotationDeg: v })}
      />

      {/* 6. 좌우 / 상하 반전 */}
      <div className="space-y-1 pt-1 border-t border-border/50">
        <label className="text-[11px] font-semibold text-muted-foreground">화면 반전</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ horizontalFlip: !config.horizontalFlip })}
            className={`py-1.5 text-xs rounded border flex items-center justify-center gap-1 transition ${
              config.horizontalFlip
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>좌우 반전</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ verticalFlip: !config.verticalFlip })}
            className={`py-1.5 text-xs rounded border flex items-center justify-center gap-1 transition ${
              config.verticalFlip
                ? 'bg-primary text-primary-foreground border-primary font-bold'
                : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>상하 반전</span>
          </button>
        </div>
      </div>
    </BaseFloatingInspectorCard>
  );
};

export default VideoCropFloatingInspector;
