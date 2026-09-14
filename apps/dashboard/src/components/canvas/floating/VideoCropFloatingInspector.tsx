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
  layoutTemplateMode?: string;
  instaConfig?: any;
  setInstaConfig?: any;
  defaultPosition?: { x: number; y: number };
}

export const VideoCropFloatingInspector: React.FC<VideoCropFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  layoutTemplateMode,
  instaConfig,
  setInstaConfig,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title={layoutTemplateMode === 'instagram' ? "인스타 비디오 창 & 구도" : "비디오 화면 & 구도"}
      icon={<Film className="w-4 h-4 text-cyan-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 📐 [인스타 전용] 비디오 창 프레임 크기 & 위치 */}
      {layoutTemplateMode === 'instagram' && instaConfig && setInstaConfig && (
        <div className="space-y-2 pb-2 mb-2 border-b border-border/50">
          <span className="text-[11px] font-bold text-foreground block">인스타 창 크기 & 비율</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                setInstaConfig((prev: any) => ({
                  ...prev,
                  holeRatio: '1:1',
                  holeWidthPct: 88,
                  holeHeightPct: 49.5,
                  holeYPct: 42,
                }));
              }}
              className={`py-1 text-[10px] rounded border transition font-medium ${
                instaConfig.holeRatio === '1:1'
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              1:1 정사각
            </button>
            <button
              type="button"
              onClick={() => {
                setInstaConfig((prev: any) => ({
                  ...prev,
                  holeRatio: '4:5',
                  holeWidthPct: 88,
                  holeHeightPct: 62,
                  holeYPct: 46,
                }));
              }}
              className={`py-1 text-[10px] rounded border transition font-medium ${
                instaConfig.holeRatio === '4:5'
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              4:5 세로형
            </button>
            <button
              type="button"
              onClick={() => {
                setInstaConfig((prev: any) => ({
                  ...prev,
                  holeRatio: 'fullscreen',
                  holeWidthPct: 96,
                  holeHeightPct: 54,
                  holeYPct: 42,
                }));
              }}
              className={`py-1 text-[10px] rounded border transition font-medium ${
                instaConfig.holeRatio === 'fullscreen'
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/20 text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              풀너비 (96%)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <UnitSliderControl
              label="창 너비"
              value={instaConfig.holeWidthPct ?? 88}
              min={50}
              max={100}
              step={0.5}
              unit="%"
              onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, holeRatio: 'custom', holeWidthPct: val }))}
            />
            <UnitSliderControl
              label="창 높이"
              value={instaConfig.holeHeightPct ?? 49.5}
              min={20}
              max={80}
              step={0.5}
              unit="%"
              onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, holeRatio: 'custom', holeHeightPct: val }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <UnitSliderControl
              label="창 Y 위치"
              value={instaConfig.holeYPct ?? 42}
              min={20}
              max={75}
              step={0.5}
              unit="%"
              onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, holeYPct: val }))}
            />
            <UnitSliderControl
              label="모서리 둥글기"
              value={instaConfig.holeRoundness ?? 16}
              min={0}
              max={48}
              step={1}
              unit="px"
              onChange={(val) => setInstaConfig((prev: any) => ({ ...prev, holeRoundness: val }))}
            />
          </div>
        </div>
      )}

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
