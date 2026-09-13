import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { Switch } from '@/components/ui/switch';
import { Camera, CheckCircle2, Volume2, UserCheck, Image as ImageIcon } from 'lucide-react';

export interface InstaProfileConfig {
  avatarUrl: string;
  nickname: string;
  handle: string;
  isVerified: boolean;
  timeText: string;
  showFollowBtn: boolean;
  showSoundIcon: boolean;
  textColor: string;
  fontSizeMultiplier: number;
  offsetX: number;
  offsetY: number;
}

export interface InstaProfileFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: InstaProfileConfig;
  onChange: (patch: Partial<InstaProfileConfig>) => void;
  onReset: () => void;
  defaultPosition?: { x: number; y: number };
}

export const InstaProfileFloatingInspector: React.FC<InstaProfileFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="인스타그램 프로필 바"
      icon={<Camera className="w-4 h-4 text-pink-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 프로필 이미지 URL & 닉네임 */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>아바타 이미지 URL</span>
        </label>
        <input
          type="text"
          value={config.avatarUrl}
          onChange={(e) => onChange({ avatarUrl: e.target.value })}
          placeholder="https://... 아바타 이미지 주소"
          className="w-full px-2.5 py-1.5 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">계정 닉네임</label>
          <input
            type="text"
            value={config.nickname}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder="viraloop_official"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-muted-foreground">핸들 / 아이디</label>
          <input
            type="text"
            value={config.handle}
            onChange={(e) => onChange({ handle: e.target.value })}
            placeholder="@viraloop"
            className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* 2. 파란색 인증 뱃지 (Blue Check) */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20" />
          <span>공식 인증 뱃지 (파란 딱지)</span>
        </span>
        <Switch
          checked={config.isVerified}
          onCheckedChange={(c) => onChange({ isVerified: c })}
        />
      </div>

      {/* 3. 팔로우 버튼 & 사운드 아이콘 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <span>팔로우 버튼 표시</span>
        </span>
        <Switch
          checked={config.showFollowBtn}
          onCheckedChange={(c) => onChange({ showFollowBtn: c })}
        />
      </div>

      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span>사운드/음악 아이콘</span>
        </span>
        <Switch
          checked={config.showSoundIcon}
          onCheckedChange={(c) => onChange({ showSoundIcon: c })}
        />
      </div>

      {/* 4. 등록 시간 문구 */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-muted-foreground">업로드 시간</label>
        <input
          type="text"
          value={config.timeText}
          onChange={(e) => onChange({ timeText: e.target.value })}
          placeholder="방금 전 · 원본 오디오"
          className="w-full px-2 py-1 text-xs bg-muted/30 border border-border rounded-[4px] focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* 5. 글자 색상 & 크기 */}
      <ColorPicker8Preset
        label="텍스트 색상"
        value={config.textColor}
        onChange={(c) => onChange({ textColor: c })}
      />
      <UnitSliderControl
        label="프로필 크기 배율"
        value={config.fontSizeMultiplier}
        min={0.7}
        max={1.6}
        step={0.05}
        unit="x"
        onChange={(v) => onChange({ fontSizeMultiplier: v })}
      />

      {/* 6. 위치 오프셋 */}
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

export default InstaProfileFloatingInspector;
