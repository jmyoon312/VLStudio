import React from 'react';
import { BaseFloatingInspectorCard } from '../controls/BaseFloatingInspectorCard';
import { ColorPicker8Preset } from '../controls/ColorPicker8Preset';
import { UnitSliderControl } from '../controls/UnitSliderControl';
import { TypographyControlGroup } from '../forms/shared';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Layout, Upload, Sparkles } from 'lucide-react';

export interface SsulHeaderConfig {
  enabled: boolean;
  bgColor: string;
  heightMultiplier: number;
  text: string;
  textColor: string;
  font: string;
  fontSizeMultiplier: number;
  bold: boolean;
  italic: boolean;
  logoUrl?: string;
  leftIcon: 'arrow_back' | 'home' | 'close' | 'none';
  rightIcon: 'menu' | 'share' | 'bookmark' | 'none';
  letterSpacing?: number;
  lineHeight?: number;
}

export interface SsulHeaderFloatingInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  config: SsulHeaderConfig;
  onChange: (patch: Partial<SsulHeaderConfig>) => void;
  onReset: () => void;
  defaultChannelName?: string;
  defaultPosition?: { x: number; y: number };
}

export const SsulHeaderFloatingInspector: React.FC<SsulHeaderFloatingInspectorProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
  onReset,
  defaultChannelName = '채널명',
  defaultPosition,
}) => {
  return (
    <BaseFloatingInspectorCard
      title="헤더 바"
      icon={<Layout className="w-4 h-4 text-amber-500" />}
      isOpen={isOpen}
      onClose={onClose}
      onReset={onReset}
      defaultPosition={defaultPosition}
    >
      {/* 1. 표시 스위치 토글 */}
      <div className="flex items-center justify-between py-1 border-b border-border/50">
        <span className="text-[11.5px] font-semibold text-foreground">표시</span>
        <Switch
          checked={config.enabled}
          onCheckedChange={(c) => onChange({ enabled: c })}
        />
      </div>

      {config.enabled && (
        <>
          {/* 2. 배경색 (8선 프리셋 + HEX) */}
          <ColorPicker8Preset
            label="배경색"
            value={config.bgColor || '#F5D05F'}
            onChange={(color) => onChange({ bgColor: color })}
          />

          {/* 3. 이미지 로고 업로드 */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-medium text-foreground">로고 이미지</span>
            <div className="flex items-center gap-1.5">
              {config.logoUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ logoUrl: undefined })}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  제거
                </button>
              )}
              <label className="h-7 px-2.5 text-[10.5px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-dashed border-border rounded-md cursor-pointer transition flex items-center gap-1.5 shadow-2xs">
                <Upload className="w-3 h-3 text-muted-foreground" />
                <span>{config.logoUrl ? '변경' : '업로드'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const url = URL.createObjectURL(file);
                    onChange({ logoUrl: url, bgColor: config.bgColor });
                  }
                }} />
              </label>
            </div>
          </div>

          {/* 4. 바 높이 배율 */}
          <UnitSliderControl
            label="높이"
            value={config.heightMultiplier ?? 1.0}
            min={0.8}
            max={3.0}
            step={0.1}
            unit="x"
            onChange={(v) => onChange({ heightMultiplier: v })}
          />

          {/* 5. 채널명 텍스트 인풋 (기본 채널명 자동연동 + 수동 수정) */}
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">텍스트</span>
              {defaultChannelName && config.text !== defaultChannelName && (
                <button
                  type="button"
                  onClick={() => onChange({ text: defaultChannelName })}
                  className="text-[9.5px] text-primary hover:underline cursor-pointer"
                >
                  운영채널명 자동적용
                </button>
              )}
            </div>
            <input
              type="text"
              value={config.text}
              onChange={(e) => onChange({ text: e.target.value })}
              placeholder={defaultChannelName || '채널명을 입력하세요'}
              className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground focus:ring-1 focus:ring-primary shadow-2xs"
            />
          </div>

          {/* 6. 타이포그래피 (글자색, 글꼴, 크기, 굵게, 기울임 등) */}
          <TypographyControlGroup
            font={config.font || 'Pretendard'}
            setFont={(font) => onChange({ font })}
            color={config.textColor || '#1F2937'}
            setColor={(textColor) => onChange({ textColor })}
            fontSizeMultiplier={config.fontSizeMultiplier ?? 1.0}
            setFontSizeMultiplier={(fontSizeMultiplier) => onChange({ fontSizeMultiplier })}
            bold={config.bold}
            setBold={(bold) => onChange({ bold })}
            italic={config.italic}
            setItalic={(italic) => onChange({ italic })}
            letterSpacing={config.letterSpacing ?? 0}
            setLetterSpacing={(letterSpacing) => onChange({ letterSpacing })}
            lineHeight={config.lineHeight ?? 1.2}
            setLineHeight={(lineHeight) => onChange({ lineHeight })}
          />

          {/* 10. 좌/우 아이콘 설정 */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold">좌 아이콘</span>
              <select
                value={config.leftIcon || 'arrow_back'}
                onChange={(e) => onChange({ leftIcon: e.target.value as any })}
                className="w-full h-7 px-1.5 text-[11px] bg-background border border-border rounded text-foreground cursor-pointer"
              >
                <option value="arrow_back">❮ 뒤로가기</option>
                <option value="home">⌂ 홈</option>
                <option value="close">✕ 닫기</option>
                <option value="none">없음</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold">우 아이콘</span>
              <select
                value={config.rightIcon || 'menu'}
                onChange={(e) => onChange({ rightIcon: e.target.value as any })}
                className="w-full h-7 px-1.5 text-[11px] bg-background border border-border rounded text-foreground cursor-pointer"
              >
                <option value="menu">≡ 메뉴</option>
                <option value="share">➦ 공유</option>
                <option value="bookmark">★ 북마크</option>
                <option value="none">없음</option>
              </select>
            </div>
          </div>

          {/* 11. 하단 액션 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({
                heightMultiplier: 1.5,
                fontSizeMultiplier: 1.8,
                bold: true,
              });
            }}
            className="w-full h-8 text-xs font-semibold text-foreground border-border hover:bg-muted/80 shadow-2xs mt-1"
          >
            <Sparkles className="w-3 h-3 text-amber-500 mr-1.5" />
            <span>채널명 기준 일직선 정렬</span>
          </Button>
        </>
      )}
    </BaseFloatingInspectorCard>
  );
};

export default SsulHeaderFloatingInspector;
